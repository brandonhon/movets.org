.PHONY: dev build serve docker docker-run check-links deploy-worker deploy-infra clean

# --- Local Development ---

dev: ## Start Tailwind watch + local server
	@echo "Starting Tailwind CSS watch..."
	npx tailwindcss -i ./tailwind.css -o ./site/css/styles.css --watch &
	@echo "Serving site at http://localhost:8080"
	npx serve site -l 8080

build: ## Build Tailwind CSS (production)
	npx tailwindcss -i ./tailwind.css -o ./site/css/styles.css --minify

serve: ## Serve the built site locally
	npx serve site -l 8080

# --- Docker ---

docker: ## Build Docker image
	docker build -t movets-org .

docker-run: docker ## Build and run Docker container
	docker run --rm -p 8080:8080 movets-org

# --- Quality Checks ---

check-links: ## Check all links in the site
	node scripts/check-links.js

# --- Deployment ---

deploy-worker: ## Deploy Cloudflare Worker
	cd worker && npm run deploy

deploy-infra: ## Apply Terraform infrastructure
	cd terraform && terraform init && terraform apply

# --- Help ---

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-16s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
