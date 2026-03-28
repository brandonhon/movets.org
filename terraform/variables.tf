variable "cloudflare_api_token" {
  description = "Cloudflare API token with Workers, D1, and Turnstile permissions"
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

variable "turnstile_site_key" {
  description = "Cloudflare Turnstile site key (public)"
  type        = string
}

variable "turnstile_secret_key" {
  description = "Cloudflare Turnstile secret key"
  type        = string
  sensitive   = true
}
