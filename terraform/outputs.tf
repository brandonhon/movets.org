output "worker_url" {
  description = "Cloudflare Worker API URL"
  value       = "https://movets-api.${var.workers_subdomain}.workers.dev"
}

output "d1_database_id" {
  description = "D1 database ID (update in worker/wrangler.toml)"
  value       = cloudflare_d1_database.email_log.id
}

output "turnstile_site_key" {
  description = "Turnstile site key (auto-configured in Pages build)"
  value       = cloudflare_turnstile_widget.contact_form.id
}

output "pages_url" {
  description = "Cloudflare Pages URL"
  value       = "https://${cloudflare_pages_project.site.subdomain}"
}

output "pages_custom_domain" {
  description = "Custom domain for Pages (add CNAME in DNS)"
  value       = var.domain
}

output "dns_records" {
  description = "DNS records to add at your registrar"
  value       = <<-EOT
    CNAME  @    → movets-org.pages.dev
    CNAME  www  → movets-org.pages.dev
  EOT
}
