output "worker_url" {
  description = "Cloudflare Worker API URL"
  value       = "https://movets-api.${var.cloudflare_account_id}.workers.dev"
}

output "d1_database_id" {
  description = "D1 database ID (update in worker/wrangler.toml)"
  value       = cloudflare_d1_database.email_log.id
}

output "turnstile_site_key" {
  description = "Turnstile site key (add to HTML pages)"
  value       = cloudflare_turnstile_widget.contact_form.id
}

output "pages_url" {
  description = "Cloudflare Pages URL"
  value       = "https://${cloudflare_pages_project.site.subdomain}"
}

output "pages_domain" {
  description = "Custom domain for Pages (add CNAME in DNS)"
  value       = var.domain
}
