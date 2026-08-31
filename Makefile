# Create postgres DB container.
test-db:
	@docker run --name inkdrop-studio-postgres-container \
		-e POSTGRES_USER=inkdrop \
		-e POSTGRES_PASSWORD=inkdrop \
		-e POSTGRES_DB=inkdrop \
		-p 5432:5432 \
		-d postgres:17

# Generate SQL migration after schema change.
generate:
	@echo "Generate SQL file by comparing drizzle/meta with src/lib/db/schema.ts"
	@if [ -z "$(NAME)" ]; then \
		echo "ERROR: Migration name not specified. Usage: make generate NAME=init_tables"; \
		exit 1; \
	fi
	@echo "New migration name: $(NAME)"
	@npx drizzle-kit generate --name "$(NAME)"

# Run pending migrations.
migrate:
	@echo "Running migrations from the drizzle/ folder"
	@npx drizzle-kit migrate
