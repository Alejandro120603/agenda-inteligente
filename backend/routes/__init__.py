"""Compatibility helpers that re-export the actual blueprints."""

from ..app.routes import bp as main_bp
from ..app.routes.google_events import bp as google_bp

bp = main_bp
google_events_bp = google_bp

__all__ = ["bp", "main_bp", "google_bp", "google_events_bp"]
