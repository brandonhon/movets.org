.PHONY: dev build serve docker docker-run check-links dashboard newsletter-preview newsletter-send deploy-worker deploy-infra clean

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

# --- Dashboard ---

dashboard: ## Show email + subscriber stats from remote D1
	node scripts/visualize.js

dashboard-local: ## Show email + subscriber stats from local dev D1
	node scripts/visualize.js --local

dashboard-emails: ## Show email stats only
	node scripts/visualize.js --emails

dashboard-subs: ## Show subscriber stats only
	node scripts/visualize.js --subscribers

export-csv: ## Export emails and subscribers to CSV
	node scripts/visualize.js --export-csv

export-csv-local: ## Export local dev data to CSV
	node scripts/visualize.js --local --export-csv

# --- Newsletter ---

newsletter-preview: ## Preview newsletter (dry run, no emails sent)
	node scripts/send-newsletter.js --subject "HB2089 Update" --content scripts/newsletter-example.html --dry-run

newsletter-send: ## Send newsletter to all subscribers
	node scripts/send-newsletter.js --subject "HB2089 Update" --content scripts/newsletter-example.html

# --- Deployment ---

deploy-worker: ## Deploy Cloudflare Worker
	cd worker && npm run deploy

deploy-infra: ## Apply Terraform infrastructure
	cd terraform && terraform init && terraform apply

# --- Help ---

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-16s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
