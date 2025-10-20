from datetime import datetime
from typing import Any, Dict, List

import requests
from flask import Blueprint, jsonify, request


google_events_bp = Blueprint("google_events", __name__, url_prefix="/api/google")


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


@google_events_bp.route("/events", methods=["POST"])
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
