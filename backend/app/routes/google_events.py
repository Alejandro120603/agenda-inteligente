"""Endpoints de integración con Google Calendar."""

from __future__ import annotations

import json
import os
import traceback
from datetime import datetime, timedelta
from typing import Any, Dict, Iterable, List, Optional, Tuple
from urllib.parse import unquote, urlencode

import requests
from flask import Blueprint, current_app, jsonify, redirect, request

from .. import db
from ..models import CuentaConectada, EventoExterno, Usuario

bp = Blueprint("google_events", __name__, url_prefix="/api/google")

GOOGLE_AUTH_SCOPE = " ".join(
    [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "openid",
    ]
)
GOOGLE_EVENTS_ENDPOINT = (
    "https://www.googleapis.com/calendar/v3/calendars/primary/events"
)
GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo"


def _get_google_oauth_settings() -> Dict[str, str]:
    """Obtiene la configuración necesaria para Google OAuth desde config o env."""

    required_keys = (
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "GOOGLE_REDIRECT_URI",
    )
    settings: Dict[str, str] = {}
    missing: List[str] = []

    for key in required_keys:
        value = current_app.config.get(key) or os.getenv(key)
        if value:
            settings[key] = value
        else:
            missing.append(key)

    if missing:
        current_app.logger.error(
            "Variables obligatorias para Google OAuth ausentes: %s",
            ", ".join(missing),
        )
        raise RuntimeError(
            "Faltan variables de configuración requeridas: " + ", ".join(missing)
        )

    return settings


def _decode_state(value: Optional[str]) -> Dict[str, Any]:
    if not value:
        return {}

    try:
        decoded = unquote(value)
        data = json.loads(decoded)
        return data if isinstance(data, dict) else {}
    except (ValueError, json.JSONDecodeError):
        current_app.logger.warning("No se pudo decodificar el parámetro state enviado por Google.")
        return {}


def _validate_redirect(target: Optional[str]) -> Optional[str]:
    if not target:
        return None

    allowed_base = (
        current_app.config.get("FRONTEND_BASE_URL")
        or os.getenv("FRONTEND_BASE_URL")
        or "http://localhost:5173"
    )

    if not target.startswith(allowed_base):
        current_app.logger.warning(
            "Intento de redirección no permitido a %s. Base permitida: %s",
            target,
            allowed_base,
        )
        return None

    return target


def _build_redirect_url(target: str, params: Dict[str, Any]) -> str:
    filtered = {k: v for k, v in params.items() if v not in (None, "")}
    return f"{target}?{urlencode(filtered)}" if filtered else target


def _exchange_code_for_tokens(code: str) -> Dict[str, Any]:
    oauth_settings = _get_google_oauth_settings()
    data = {
        "code": code,
        "client_id": oauth_settings["GOOGLE_CLIENT_ID"],
        "client_secret": oauth_settings["GOOGLE_CLIENT_SECRET"],
        "redirect_uri": oauth_settings["GOOGLE_REDIRECT_URI"],
        "grant_type": "authorization_code",
    }

    response = requests.post(GOOGLE_TOKEN_ENDPOINT, data=data, timeout=10)
    if response.status_code != 200:
        error_details = response.text
        current_app.logger.error(
            "Error al intercambiar el código de autorización de Google: %s",
            error_details,
        )
        raise RuntimeError("No se pudo completar el intercambio de tokens con Google.")

    return response.json()


def _fetch_google_user_info(access_token: str) -> Dict[str, Any]:
    try:
        response = requests.get(
            GOOGLE_USERINFO_ENDPOINT,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
    except requests.RequestException as exc:  # pragma: no cover - errores de red
        raise RuntimeError("No se pudo obtener la información del usuario de Google.") from exc

    if response.status_code != 200:
        current_app.logger.error(
            "Respuesta inesperada de Google al pedir userinfo: %s",
            response.text,
        )
        raise RuntimeError("No se pudo obtener la información del usuario de Google.")

    userinfo = response.json()
    if not isinstance(userinfo, dict):
        raise RuntimeError("Google devolvió un userinfo inválido.")
    return userinfo


def _get_or_create_user(email: Optional[str], name: Optional[str]) -> Usuario:
    if not email:
        raise RuntimeError("Google no devolvió un correo electrónico válido.")

    usuario = Usuario.query.filter_by(correo=email).first()
    if usuario:
        return usuario

    usuario = Usuario(
        nombre=name or email.split("@")[0],
        correo=email,
        zona_horaria="UTC",
    )
    db.session.add(usuario)
    db.session.commit()

    current_app.logger.info("Creado usuario %s a partir de Google OAuth", usuario.id)
    return usuario


def _save_tokens(
    usuario: Usuario, tokens: Dict[str, Any], correo_vinculado: Optional[str]
) -> CuentaConectada:
    cuenta = CuentaConectada.query.filter_by(
        id_usuario=usuario.id, proveedor="google"
    ).first()

    if not cuenta:
        cuenta = CuentaConectada(
            usuario=usuario,
            proveedor="google",
        )
        db.session.add(cuenta)

    expires_in = tokens.get("expires_in")
    expiration = (
        datetime.utcnow() + timedelta(seconds=int(expires_in))
        if expires_in
        else None
    )

    cuenta.correo_vinculado = correo_vinculado or usuario.correo
    cuenta.access_token = tokens.get("access_token")
    cuenta.token_expira_en = expiration
    cuenta.sincronizado_en = datetime.utcnow()

    refresh_token = tokens.get("refresh_token")
    if refresh_token:
        cuenta.refresh_token = refresh_token

    db.session.commit()
    current_app.logger.info("OAuth tokens guardados para el usuario %s", usuario.id)

    return cuenta


def _token_needs_refresh(cuenta: CuentaConectada) -> bool:
    if not cuenta.token_expira_en:
        return False
    return cuenta.token_expira_en <= datetime.utcnow() + timedelta(minutes=2)


def _refresh_access_token(cuenta: CuentaConectada) -> str:
    if not cuenta.refresh_token:
        raise RuntimeError("No hay refresh_token almacenado para esta cuenta.")

    oauth_settings = _get_google_oauth_settings()
    data = {
        "client_id": oauth_settings["GOOGLE_CLIENT_ID"],
        "client_secret": oauth_settings["GOOGLE_CLIENT_SECRET"],
        "grant_type": "refresh_token",
        "refresh_token": cuenta.refresh_token,
    }

    response = requests.post(GOOGLE_TOKEN_ENDPOINT, data=data, timeout=10)
    if response.status_code != 200:
        current_app.logger.error(
            "Google rechazó el refresh token para la cuenta %s: %s",
            cuenta.id,
            response.text,
        )
        raise RuntimeError("No se pudo refrescar el access_token de Google.")

    data = response.json()
    cuenta.access_token = data.get("access_token")

    expires_in = data.get("expires_in")
    if expires_in:
        cuenta.token_expira_en = datetime.utcnow() + timedelta(seconds=int(expires_in))

    new_refresh = data.get("refresh_token")
    if new_refresh:
        cuenta.refresh_token = new_refresh

    cuenta.sincronizado_en = datetime.utcnow()
    db.session.commit()

    current_app.logger.info("Token de acceso refrescado para la cuenta %s", cuenta.id)
    return cuenta.access_token or ""


def _parse_google_datetime(time_info: Optional[Dict[str, Any]]) -> Optional[datetime]:
    if not time_info:
        return None

    value = time_info.get("dateTime") or time_info.get("date")
    if not value:
        return None

    if len(value) == 10:  # Fecha sin hora
        try:
            return datetime.strptime(value, "%Y-%m-%d")
        except ValueError:
            return None

    if value.endswith("Z"):
        value = value[:-1] + "+00:00"

    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def _map_event_status(status: Optional[str]) -> Optional[str]:
    if not status:
        return "confirmado"

    mapping = {
        "confirmed": "confirmado",
        "cancelled": "cancelado",
        "tentative": "tentativo",
    }
    return mapping.get(status.lower(), "confirmado")


def _normalize_event(event: Dict[str, Any]) -> Dict[str, Any]:
    start_info = event.get("start", {})
    end_info = event.get("end", {})

    def _extract_time(info: Dict[str, Any]) -> Optional[str]:
        return info.get("dateTime") or info.get("date")

    is_all_day = bool(start_info.get("date") and not start_info.get("dateTime"))

    return {
        "id": event.get("id"),
        "summary": event.get("summary", "Sin título"),
        "description": event.get("description"),
        "start": _extract_time(start_info),
        "end": _extract_time(end_info),
        "location": event.get("location"),
        "htmlLink": event.get("htmlLink"),
        "status": event.get("status"),
        "isAllDay": is_all_day,
    }


def _persist_events(
    cuenta: CuentaConectada, items: Iterable[Dict[str, Any]]
) -> None:
    existentes: Dict[str, EventoExterno] = {
        evento.id_evento_externo: evento for evento in cuenta.eventos
    }
    vistos: set[str] = set()

    for item in items:
        event_id = item.get("id")
        if not event_id:
            continue
        vistos.add(event_id)

        evento = existentes.get(event_id)
        if not evento:
            evento = EventoExterno(
                cuenta=cuenta,
                id_evento_externo=event_id,
                origen="google",
            )
            db.session.add(evento)

        evento.titulo = item.get("summary", "Sin título")
        evento.descripcion = item.get("description")
        evento.inicio = _parse_google_datetime(item.get("start"))
        evento.fin = _parse_google_datetime(item.get("end"))
        evento.estado = _map_event_status(item.get("status"))
        evento.sincronizado_en = datetime.utcnow()

    for event_id, evento in existentes.items():
        if event_id not in vistos:
            db.session.delete(evento)

    cuenta.sincronizado_en = datetime.utcnow()
    db.session.commit()


def _call_google_events(access_token: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    params = {
        "maxResults": 15,
        "orderBy": "startTime",
        "singleEvents": "true",
        "timeMin": datetime.utcnow().isoformat() + "Z",
    }
    headers = {"Authorization": f"Bearer {access_token}"}

    try:
        response = requests.get(
            GOOGLE_EVENTS_ENDPOINT,
            params=params,
            headers=headers,
            timeout=10,
        )
    except requests.RequestException as exc:  # pragma: no cover - errores de red
        raise RuntimeError("No se pudo conectar con Google Calendar.") from exc

    if response.status_code != 200:
        try:
            error_info = response.json()
        except ValueError:  # pragma: no cover - cuerpo inesperado
            error_info = {"error": response.text}

        error_message = error_info.get("error", {})
        if isinstance(error_message, dict):
            error_message = error_message.get("message")

        raise RuntimeError(error_message or "No se pudieron obtener los eventos de Google.")

    payload = response.json()
    items: List[Dict[str, Any]] = payload.get("items", [])
    normalized = [_normalize_event(event) for event in items]
    return items, normalized


def _fetch_events_for_account(cuenta: CuentaConectada) -> List[Dict[str, Any]]:
    if _token_needs_refresh(cuenta):
        _refresh_access_token(cuenta)

    access_token = cuenta.access_token
    if not access_token:
        raise RuntimeError("No hay un access_token válido para esta cuenta.")

    items, normalized = _call_google_events(access_token)
    _persist_events(cuenta, items)
    return normalized


@bp.route("/auth", methods=["GET"])
def initialize_google_oauth():
    """Devuelve la URL de autorización de Google OAuth."""

    try:
        oauth_settings = _get_google_oauth_settings()
        client_id = oauth_settings["GOOGLE_CLIENT_ID"]
        redirect_uri = oauth_settings["GOOGLE_REDIRECT_URI"]

        state = request.args.get("state")
        scope = request.args.get("scope", GOOGLE_AUTH_SCOPE)

        query_params = {
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "scope": scope,
            "access_type": "offline",
            "include_granted_scopes": "true",
            "prompt": "consent",
        }
        if state:
            query_params["state"] = state

        auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(query_params)
        current_app.logger.info(
            "Generada URL de OAuth de Google con redirect_uri=%s", redirect_uri
        )

        return jsonify({"auth_url": auth_url}), 200
    except Exception as exc:  # pylint: disable=broad-except
        error_message = f"Error al iniciar OAuth de Google: {exc}"
        traceback_str = traceback.format_exc()
        current_app.logger.error("%s\n%s", error_message, traceback_str)
        return (
            jsonify({
                "error": "OAuth init failed",
                "details": str(exc),
            }),
            500,
        )


@bp.route("/callback", methods=["GET", "POST"])
def google_oauth_callback():
    """Recibe el código de Google, guarda tokens y sincroniza eventos."""

    payload = request.get_json(silent=True) or {} if request.method == "POST" else {}
    code = payload.get("code") if request.method == "POST" else request.args.get("code")
    state = payload.get("state") if request.method == "POST" else request.args.get("state")

    state_data = _decode_state(state)

    if not code:
        message = "Google no devolvió el parámetro 'code'."
        if request.method == "GET":
            redirect_target = _validate_redirect(state_data.get("redirect"))
            if redirect_target:
                return redirect(
                    _build_redirect_url(
                        redirect_target,
                        {
                            "status": "error",
                            "message": message,
                            "next": state_data.get("next"),
                        },
                    )
                )
        return jsonify({"error": message}), 400

    try:
        tokens = _exchange_code_for_tokens(code)
        access_token = tokens.get("access_token")
        if not access_token:
            raise RuntimeError("Google no devolvió un access_token válido.")

        userinfo = _fetch_google_user_info(access_token)
        usuario = _get_or_create_user(
            email=userinfo.get("email"), name=userinfo.get("name")
        )
        cuenta = _save_tokens(usuario, tokens, userinfo.get("email"))
        events = _fetch_events_for_account(cuenta)

        response_body = {
            "message": "Cuenta de Google conectada exitosamente.",
            "usuario": {
                "id": usuario.id,
                "nombre": usuario.nombre,
                "correo": usuario.correo,
            },
            "events": events,
        }

        redirect_target = _validate_redirect(state_data.get("redirect"))
        if request.method == "GET" and redirect_target:
            return redirect(
                _build_redirect_url(
                    redirect_target,
                    {
                        "status": "success",
                        "user_id": usuario.id,
                        "email": usuario.correo,
                        "name": usuario.nombre,
                        "next": state_data.get("next"),
                    },
                )
            )

        return jsonify(response_body), 200
    except Exception as exc:  # pylint: disable=broad-except
        traceback_str = traceback.format_exc()
        current_app.logger.error(
            "Error durante el callback de Google OAuth: %s\n%s", exc, traceback_str
        )

        if request.method == "GET":
            redirect_target = _validate_redirect(state_data.get("redirect"))
            if redirect_target:
                return redirect(
                    _build_redirect_url(
                        redirect_target,
                        {
                            "status": "error",
                            "message": str(exc),
                            "next": state_data.get("next"),
                        },
                    )
                )

        return (
            jsonify({
                "error": "Google OAuth callback failed",
                "details": str(exc),
            }),
            500,
        )


@bp.route("/events", methods=["GET", "POST"])
def fetch_google_events():
    """Obtiene los próximos eventos del calendario primario de Google."""

    if request.method == "POST":
        payload = request.get_json(silent=True) or {}
        user_id = payload.get("user_id")
        email = payload.get("email")
        access_token = payload.get("access_token")
    else:
        user_id = request.args.get("user_id", type=int)
        email = request.args.get("email")
        access_token = request.args.get("access_token")

    if access_token:
        try:
            _, normalized = _call_google_events(access_token)
            return jsonify({"events": normalized}), 200
        except Exception as exc:  # pylint: disable=broad-except
            return jsonify({"error": str(exc)}), 400

    cuenta = None
    if user_id:
        cuenta = CuentaConectada.query.filter_by(
            id_usuario=user_id, proveedor="google"
        ).first()
    elif email:
        cuenta = (
            CuentaConectada.query.join(Usuario)
            .filter(Usuario.correo == email, CuentaConectada.proveedor == "google")
            .first()
        )

    if not cuenta:
        return jsonify({"events": [], "requires_auth": True}), 200

    try:
        events = _fetch_events_for_account(cuenta)
        return jsonify({"events": events}), 200
    except Exception as exc:  # pylint: disable=broad-except
        traceback_str = traceback.format_exc()
        current_app.logger.error(
            "No se pudieron sincronizar los eventos de Google: %s\n%s",
            exc,
            traceback_str,
        )
        return (
            jsonify({
                "error": "No se pudieron sincronizar los eventos de Google.",
                "details": str(exc),
            }),
            500,
        )


__all__ = ["bp"]
