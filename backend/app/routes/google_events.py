from datetime import datetime
import os
import traceback
from typing import Any, Dict, List
from urllib.parse import urlencode

import requests
from flask import Blueprint, jsonify, request, current_app

bp = Blueprint("google_events", __name__, url_prefix="/api/google")


@bp.route("/auth", methods=["GET"])
def initialize_google_oauth():
    """Devuelve la URL de autorización de Google OAuth."""
    try:
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")

        missing_vars = [
            name
            for name, value in (
                ("GOOGLE_CLIENT_ID", client_id),
                ("GOOGLE_CLIENT_SECRET", client_secret),
                ("GOOGLE_REDIRECT_URI", redirect_uri),
            )
            if not value
        ]

        if missing_vars:
            raise RuntimeError(
                "Faltan variables de entorno requeridas: " + ", ".join(missing_vars)
            )

        scope = request.args.get(
            "scope",
            "https://www.googleapis.com/auth/calendar.readonly",
        )
        state = request.args.get("state")

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

        auth_url = (
            "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(query_params)
        )

        return jsonify({"auth_url": auth_url}), 200
    except Exception as exc:  # pylint: disable=broad-except
        error_message = f"Error al iniciar OAuth de Google: {exc}"
        traceback_str = traceback.format_exc()
        current_app.logger.error("%s\n%s", error_message, traceback_str)
        print(error_message, traceback_str, sep="\n", flush=True)
        return (
            jsonify({
                "error": "OAuth init failed",
                "details": str(exc),
            }),
            500,
        )


def _normalize_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """Extrae los campos relevantes de un evento del calendario."""
    start = event.get("start", {})
    end = event.get("end", {})

    def _extract_time(info: Dict[str, Any]) -> Any:
        return info.get("dateTime") or info.get("date")

    return {
        "id": event.get("id"),
        "summary": event.get("summary", "Sin título"),
        "description": event.get("description"),
        "start": _extract_time(start),
        "end": _extract_time(end),
        "location": event.get("location"),
        "htmlLink": event.get("htmlLink"),
    }


@bp.route("/events", methods=["POST"])
def fetch_google_events():
    """Obtiene los próximos eventos del calendario primario de Google."""
    payload = request.get_json(silent=True) or {}
    access_token = payload.get("access_token")

    if not access_token:
        return (
            jsonify({"error": "Falta el access_token de Google."}),
            400,
        )

    params = {
        "maxResults": 10,
        "orderBy": "startTime",
        "singleEvents": "true",
        "timeMin": datetime.utcnow().isoformat() + "Z",
    }
    headers = {
        "Authorization": f"Bearer {access_token}",
    }

    try:
        response = requests.get(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            params=params,
            headers=headers,
            timeout=10,
        )
    except requests.RequestException:
        return (
            jsonify({"error": "No se pudo conectar con Google Calendar."}),
            502,
        )

    if response.status_code != 200:
        try:
            error_info = response.json()
        except ValueError:
            error_info = {"error": "No se pudo leer la respuesta de Google."}

        error_message: Any = error_info.get("error", "No se pudo obtener los eventos.")
        if isinstance(error_message, dict):
            error_message = error_message.get("message", "No se pudo obtener los eventos.")

        return jsonify({"error": error_message}), response.status_code

    google_response = response.json()
    items: List[Dict[str, Any]] = google_response.get("items", [])
    events = [_normalize_event(event) for event in items]

    return jsonify({"events": events}), 200


__all__ = ["bp"]
