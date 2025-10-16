# ============================================================
# 📅 Makefile — Proyecto Agenda Inteligente
# ------------------------------------------------------------
# Comandos útiles:
#   make run            → Ejecuta el frontend (Vite)
#   make install        → Instala dependencias del frontend
#   make clean          → Limpia cachés del proyecto
#   make compose-up     → Levanta la base de datos con Docker
#   make compose-down   → Detiene y elimina contenedores/volúmenes
#   make logs           → Muestra logs de la base de datos
#   make help           → Muestra los comandos disponibles
# ============================================================

# 📂 Rutas principales
FRONTEND_DIR = frontend

.PHONY: run install clean compose-up compose-down logs help

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

# 🐳 Levanta el stack de Docker (DB)
compose-up:
	docker compose up -d --build

# 🧱 Detiene y elimina contenedores y volúmenes
compose-down:
	docker compose down -v

# 🪵 Muestra los logs de la base de datos
logs:
	docker logs -f agenda-db

# 🧾 Muestra ayuda general
help:
	@echo "Comandos disponibles:"
	@echo "  make run            → Ejecuta el servidor del frontend (Vite)"
	@echo "  make install        → Instala dependencias del frontend"
	@echo "  make clean          → Limpia cachés y builds"
	@echo "  make compose-up     → Levanta la base de datos (MySQL)"
	@echo "  make compose-down   → Detiene y limpia los contenedores"
	@echo "  make logs           → Muestra logs del contenedor MySQL"
	@echo "  make help           → Muestra este mensaje"
