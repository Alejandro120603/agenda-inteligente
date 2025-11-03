DB_PATH := data/app.db

.PHONY: db-init db-open db-clean db-dump db-backup help

help: ## Show available commands
	@echo "Commands:"; grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | sed 's/:.*##/: ##/' | awk 'BEGIN {FS="##"}; {printf "  %-20s %s\n", $$1, $$2}'

db-init: ## Create/refresh the local SQLite DB from schema + seed
	@mkdir -p data
	@rm -f $(DB_PATH)
	sqlite3 $(DB_PATH) < db/schema.sql
	sqlite3 $(DB_PATH) < db/seed.sql
	@echo "✅ SQLite ready at $(DB_PATH)"

db-open: ## Open the DB REPL
	@test -f $(DB_PATH) || (echo "DB not found. Run: make db-init" && exit 1)
	sqlite3 $(DB_PATH)

db-clean: ## Remove the local DB
	@rm -f $(DB_PATH)
	@echo "🧹 Removed $(DB_PATH)"

db-dump: ## Print a full SQL dump to stdout
	@test -f $(DB_PATH) || (echo "DB not found. Run: make db-init" && exit 1)
	sqlite3 $(DB_PATH) ".dump"

db-backup: ## Save a timestamped backup in ./data/backups/
	@test -f $(DB_PATH) || (echo "DB not found. Run: make db-init" && exit 1)
	@mkdir -p data/backups
	@ts=$$(date +"%Y-%m-%d_%H%M%S"); \
	cp $(DB_PATH) data/backups/app_$$ts.sqlite && \
	echo "💾 Backup: data/backups/app_$$ts.sqlite"
