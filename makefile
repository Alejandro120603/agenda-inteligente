# ============================================================
# 📅 Makefile — Proyecto Agenda Inteligente
# ------------------------------------------------------------
# Comandos útiles:
#   make run               → Ejecuta el frontend (Vite)
#   make install           → Instala dependencias del frontend
#   make clean             → Limpia cachés del proyecto
#   make compose-up        → Levanta todo el stack (DB + backend)
#   make compose-down      → Detiene y limpia contenedores/volúmenes
#   make reset-db          → Reinicia la base de datos desde cero
#   make show-databases    → Muestra las bases de datos actuales
#   make shell-db          → Abre una sesión en MySQL dentro del contenedor
#   make logs-db           → Muestra los logs de MySQL en tiempo real
#   make logs-backend      → Muestra logs del backend Flask
#   make shell-backend     → Abre una terminal en el backend
#   make help              → Muestra esta ayuda
# ============================================================

# 📂 Rutas principales
FRONTEND_DIR = frontend
DB_CONTAINER = agenda-db
BACKEND_CONTAINER = agenda-backend
SERVICE = agenda-inteligente

.PHONY: run install clean compose-up compose-down reset-db \
        show-databases shell-db logs-db logs-backend shell-backend help

# ------------------------------------------------------------
# 🧠 FRONTEND
# ------------------------------------------------------------

# Inicia el servidor de desarrollo (Vite)
run:
	cd $(FRONTEND_DIR) && npm run dev

# Instala dependencias del frontend
install:
	cd $(FRONTEND_DIR) && npm install

# Limpia archivos de build y cachés
clean:
	rm -rf $(FRONTEND_DIR)/node_modules
	rm -rf $(FRONTEND_DIR)/dist
	rm -rf $(FRONTEND_DIR)/.vite
	find . -name "*.log" -type f -delete

# ------------------------------------------------------------
# 🐳 DOCKER / BACKEND / BASE DE DATOS
# ------------------------------------------------------------

# Levanta todo el stack
compose-up:
	@echo "🚀 Levantando stack completo (backend + DB)..."
	docker compose up -d --build

# Detiene y limpia contenedores y volúmenes
compose-down:
	@echo "🧹 Deteniendo stack y eliminando volúmenes..."
	docker compose down -v --remove-orphans

# Reinicia completamente la base de datos
reset-db:
	@echo "🧨 Reiniciando base de datos MySQL..."
	docker rm -f $(DB_CONTAINER) 2>/dev/null || true
	docker volume rm ${SERVICE}_db-data 2>/dev/null || true
	docker compose up -d --build
	@echo "✅ Base de datos reiniciada correctamente."

# Muestra todas las bases de datos disponibles
show-databases:
	docker exec -it $(DB_CONTAINER) mysql -uroot -prootpass -e "SHOW DATABASES;"

# Abre shell de MySQL
shell-db:
	docker exec -it $(DB_CONTAINER) mysql -uroot -prootpass

# Logs en vivo de MySQL
logs-db:
	docker logs -f $(DB_CONTAINER)

# Logs en vivo del backend Flask
logs-backend:
	docker logs -f $(BACKEND_CONTAINER)

# Shell dentro del contenedor backend
shell-backend:
	docker exec -it $(BACKEND_CONTAINER) /bin/bash

# ------------------------------------------------------------
# 🧾 AYUDA
# ------------------------------------------------------------

help:
	@echo ""
	@echo "📅 COMANDOS DISPONIBLES — PROYECTO AGENDA INTELIGENTE"
	@echo "------------------------------------------------------"
	@echo "🧠 FRONTEND:"
	@echo "  make run               → Ejecuta el servidor de desarrollo (Vite)"
	@echo "  make install           → Instala dependencias del frontend"
	@echo "  make clean             → Limpia cachés y builds del frontend"
	@echo ""
	@echo "🐳 DOCKER / BACKEND / DB:"
	@echo "  make compose-up        → Levanta backend + base de datos"
	@echo "  make compose-down      → Detiene y limpia todo el stack"
	@echo "  make reset-db          → Reinicia la base de datos desde cero"
	@echo "  make show-databases    → Muestra las bases de datos actuales"
	@echo "  make shell-db          → Abre sesión MySQL dentro del contenedor"
	@echo "  make logs-db           → Muestra logs de MySQL"
	@echo "  make logs-backend      → Muestra logs del backend Flask"
	@echo "  make shell-backend     → Abre una terminal dentro del backend"
	@echo ""
	@echo "🧾 UTILIDAD:"
	@echo "  make help              → Muestra esta ayuda"
	@echo ""
