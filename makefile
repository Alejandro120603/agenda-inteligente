# ============================================================
# 📅 Makefile — Proyecto Agenda Inteligente
# ------------------------------------------------------------
# Comandos útiles:
#   make run            → Ejecuta el frontend de desarrollo
#   make install        → Instala dependencias del frontend
#   make clean          → Limpia builds y cachés
#   make help           → Muestra los comandos disponibles
# ============================================================

# Ruta del frontend
FRONTEND_DIR = frontend

.PHONY: run install clean help

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

# 🧾 Muestra ayuda general
help:
	@echo "Comandos disponibles:"
	@echo "  make run       → Ejecuta el servidor del frontend"
	@echo "  make install   → Instala dependencias del frontend"
	@echo "  make clean     → Limpia cachés y builds"
	@echo "  make help      → Muestra este mensaje"
