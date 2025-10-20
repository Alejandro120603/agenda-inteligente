from app.routes.google_events import bp as bp

# Alias para retrocompatibilidad con importaciones anteriores
google_events_bp = bp

__all__ = ["bp", "google_events_bp"]
