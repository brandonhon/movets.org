.PHONY: setup dev worker build docker docker-run check-links dashboard dashboard-local export-csv export-csv-local newsletter-preview newsletter-send deploy-worker deploy-infra db-reset clean help

# --- Setup ---

setup: ## Install all dependencies and initialize local D1
	npm install
	cd worker && npm install && npm run db:init:local

# --- Local Development ---

dev: ## Start Tailwind watch + local server (port 8080)
	@echo "Starting Tailwind CSS watch..."
	npx tailwindcss -i ./tailwind.css -o ./site/css/styles.css --watch &
	@echo "Serving site at http://localhost:8080"
	npx serve site -l 8080

worker: ## Start local Cloudflare Worker (port 8787)
	cd worker && npm run dev

build: ## Build Tailwind CSS (production)
	npx tailwindcss -i ./tailwind.css -o ./site/css/styles.css --minify

# --- Docker ---

docker: ## Build Docker image
	docker build -t movets-org .

docker-run: docker ## Build and run Docker container (port 8080)
	docker run --rm -p 8080:8080 movets-org

# --- Quality Checks ---

check-links: ## Check all links in the site
	node scripts/check-links.js

# --- Dashboard ---

dashboard: ## Show email + subscriber stats from remote D1
	node scripts/visualize.js

dashboard-local: ## Show email + subscriber stats from local D1
	node scripts/visualize.js --local

export-csv: ## Export remote D1 data to CSV
	node scripts/visualize.js --export-csv

export-csv-local: ## Export local D1 data to CSV
	node scripts/visualize.js --local --export-csv

# --- Newsletter ---

newsletter-preview: ## Dry-run newsletter (no emails sent)
	@echo "Usage: node scripts/send-newsletter.js --subject \"Title\" --content your-content.html --dry-run"
	node scripts/send-newsletter.js --subject "HB2089 Update" --content scripts/newsletter-example.html --dry-run

newsletter-send: ## Send newsletter to all subscribers
	@echo "Usage: node scripts/send-newsletter.js --subject \"Title\" --content your-content.html"
	node scripts/send-newsletter.js --subject "HB2089 Update" --content scripts/newsletter-example.html

# --- Database ---

db-reset: ## Reset local D1 database (deletes all test data)
	cd worker && rm -rf .wrangler/state && npm run db:init:local

# --- Deployment ---

deploy-worker: ## Deploy Cloudflare Worker to production
	cd worker && npm run deploy

deploy-infra: ## Apply Terraform infrastructure
	cd terraform && terraform init && terraform apply

# --- Cleanup ---

clean: ## Remove build artifacts and local state
	rm -rf site/css/styles.css worker/.wrangler/state data/*.csv

# --- Help ---

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
