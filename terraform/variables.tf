variable "cloudflare_api_token" {
  description = "Cloudflare API token with Workers, D1, Turnstile, and Pages permissions"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "domain" {
  description = "Site domain name"
  type        = string
  default     = "movets.org"
}

variable "brevo_api_key" {
  description = "Brevo transactional email API key"
  type        = string
  sensitive   = true
}

variable "turnstile_secret_key" {
  description = "Cloudflare Turnstile secret key"
  type        = string
  sensitive   = true
}

variable "cf_analytics_token" {
  description = "Cloudflare Web Analytics token"
  type        = string
}

variable "workers_subdomain" {
  description = "Cloudflare Workers subdomain (found in Workers & Pages > Overview)"
  type        = string
}

variable "github_owner" {
  description = "GitHub repository owner (user or organization)"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "movets.org"
}
