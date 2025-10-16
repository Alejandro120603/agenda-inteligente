# ============================================================
# 📅 Makefile — Proyecto Agenda Inteligente
# ------------------------------------------------------------
# Controla el frontend, backend y base de datos (Docker Compose)
# ============================================================

# 📦 Rutas
FRONTEND_DIR = frontend
BACKEND_DIR = backend

.PHONY: run install clean help compose-up compose-down logs reset-db

# ============================================================
# 🐳 DOCKER COMPOSE COMMANDS
# ============================================================

# 🚀 Levanta el stack completo (backend + db)
compose-up:
	docker compose up --build

# 🧹 Detiene y limpia contenedores
compose-down:
	docker compose down -v

# 🧰 Reinicia la base de datos MySQL
reset-db:
	docker compose down -v
	docker compose up -d db
	sleep 10
	docker exec -i agenda-db mysql -uagenda_user -pagenda123 -e "DROP DATABASE IF EXISTS agenda_inteligente; CREATE DATABASE agenda_inteligente;"

# 📜 Muestra logs del backend en tiempo real
logs:
	docker logs -f agenda-backend

# ============================================================
# 💻 FRONTEND COMMANDS
# ============================================================

# 🧠 Inicia el servidor del frontend (Vite)
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
# 🧾 AYUDA
# ============================================================

help:
	@echo "Comandos disponibles:"
	@echo "  make compose-up     → Levanta backend + MySQL (Docker)"
	@echo "  make compose-down   → Detiene y limpia contenedores"
	@echo "  make reset-db       → Reinicia la base de datos MySQL"
	@echo "  make logs           → Muestra logs del backend"
	@echo "  make run            → Ejecuta el frontend"
	@echo "  make install        → Instala dependencias del frontend"
	@echo "  make clean          → Limpia builds y cachés"
