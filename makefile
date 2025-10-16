# ============================================================
# 📅 Makefile — Proyecto Agenda Inteligente
# ------------------------------------------------------------
# Comandos útiles:
#   make run             → Ejecuta el frontend (Vite)
#   make install         → Instala dependencias del frontend
#   make clean           → Limpia cachés y builds
#   make compose-up      → Levanta backend + base de datos (Docker)
#   make compose-down    → Detiene y limpia contenedores
#   make logs            → Muestra logs del backend
#   make reset-db        → Reinicia completamente la base de datos
#   make help            → Muestra esta ayuda
# ============================================================

# 📁 Rutas
FRONTEND_DIR = frontend
BACKEND_DIR = backend

.PHONY: run install clean help compose-up compose-down logs reset-db

# ============================================================
# 🎨 FRONTEND
# ============================================================

# 🧠 Inicia el servidor de desarrollo (Vite)
run:
	cd $(FRONTEND_DIR) && npm run dev

# 📦 Instala dependencias del frontend
install:
	cd $(FRONTEND_DIR) && npm install

# 🧹 Limpia archivos de build y cachés
clean:
	rm -rf $(FRONTEND_DIR)/node_modules
	rm -rf $(FRONTEND_DIR)/dist
	rm -rf $(FRONTEND_DIR)/.vite
	find . -name "*.log" -type f -delete

# ============================================================
# 🧠 BACKEND + BASE DE DATOS (Docker)
# ============================================================

# 🚀 Levanta backend + MySQL (reconstruye si es necesario)
compose-up:
	docker compose up --build

# 🛑 Detiene y elimina contenedores
compose-down:
	docker compose down -v

# 📜 Muestra logs del backend
logs:
	docker compose logs -f backend

# 🔄 Reinicia la base de datos desde cero
reset-db:
	docker compose down -v && docker compose up --build

# ============================================================
# 🧾 AYUDA
# ============================================================

help:
	@echo "============================================================"
	@echo "📅 Comandos disponibles — Proyecto Agenda Inteligente"
	@echo "------------------------------------------------------------"
	@echo "FRONTEND (Vite + React):"
	@echo "  make run           → Inicia el servidor de desarrollo"
	@echo "  make install       → Instala dependencias del frontend"
	@echo "  make clean         → Limpia cachés y builds"
	@echo ""
	@echo "BACKEND + BASE DE DATOS (Docker + Flask + MySQL):"
	@echo "  make compose-up    → Levanta backend + MySQL con Docker"
	@echo "  make compose-down  → Detiene y limpia contenedores"
	@echo "  make logs          → Muestra logs del backend Flask"
	@echo "  make reset-db      → Reinicia por completo la base de datos"
	@echo ""
	@echo "------------------------------------------------------------"
	@echo "💡 Tip: Usa 'make help' para ver esta ayuda nuevamente."
	@echo "============================================================"
