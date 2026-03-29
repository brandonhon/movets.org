# MoVets.org Cloudflare Infrastructure — Worker, D1, Turnstile, Pages
terraform {
  required_version = ">= 1.5"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    bucket                      = "movets-terraform-state"
    key                         = "terraform.tfstate"
    region                      = "auto"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    force_path_style            = true
    # endpoint, access_key, secret_key passed via:
    #   terraform init -backend-config="endpoint=..." -backend-config="access_key=..." -backend-config="secret_key=..."
    # or via env vars AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY + endpoint in -backend-config
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# -----------------------------------------------------------------------------
# D1 Database
# -----------------------------------------------------------------------------
resource "cloudflare_d1_database" "email_log" {
  account_id = var.cloudflare_account_id
  name       = "movets-email-log"
}

# -----------------------------------------------------------------------------
# Worker Script
# -----------------------------------------------------------------------------
resource "cloudflare_workers_script" "api" {
  account_id = var.cloudflare_account_id
  name       = "movets-api"
  content    = file("${path.module}/../worker/src/index.js")
  module     = true

  d1_database_binding {
    name        = "DB"
    database_id = cloudflare_d1_database.email_log.id
  }

  plain_text_binding {
    name = "FROM_EMAIL"
    text = "noreply@${var.domain}"
  }

  plain_text_binding {
    name = "FROM_NAME"
    text = "MoVets.org"
  }

  plain_text_binding {
    name = "ALLOWED_ORIGIN"
    text = "https://${var.domain}"
  }

  secret_text_binding {
    name = "BREVO_API_KEY"
    text = var.brevo_api_key
  }

  secret_text_binding {
    name = "TURNSTILE_SECRET_KEY"
    text = var.turnstile_secret_key
  }
}

# -----------------------------------------------------------------------------
# Turnstile Widget
# -----------------------------------------------------------------------------
resource "cloudflare_turnstile_widget" "contact_form" {
  account_id = var.cloudflare_account_id
  name       = "movets-contact-form"
  domains    = [var.domain, "localhost"]
  mode       = "managed"
}

# -----------------------------------------------------------------------------
# Cloudflare Pages (static site hosting)
# -----------------------------------------------------------------------------
resource "cloudflare_pages_project" "site" {
  account_id        = var.cloudflare_account_id
  name              = "movets-org"
  production_branch = "main"

  build_config {
    build_command   = "npm run build:deploy"
    destination_dir = "site"
    root_dir        = ""
  }

  deployment_configs {
    production {
      environment_variables = {
        TURNSTILE_SITE_KEY = cloudflare_turnstile_widget.contact_form.id
        CF_ANALYTICS_TOKEN = var.cf_analytics_token
        WORKER_URL         = "https://movets-api.${var.workers_subdomain}.workers.dev"
      }
    }
  }

  source {
    type = "github"
    config {
      owner                         = var.github_owner
      repo_name                     = var.github_repo
      production_branch             = "main"
      deployments_enabled           = true
      pr_comments_enabled           = true
      production_deployment_enabled = true
    }
  }
}

# Custom domain for Pages
resource "cloudflare_pages_domain" "site" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.site.name
  domain       = var.domain
}
