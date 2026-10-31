# Storage structure

One bucket, tenant-prefixed paths. The path is organisation, not security: rules decide access.

| Path | Read | Write / delete | Limits |
|---|---|---|---|
| `tenants/{id}/branding/**` | public | `SETTINGS_MANAGE` | PNG/JPEG/WebP, ≤ 5 MB |
| `tenants/{id}/products/**` | public | `MENU_MANAGE` | PNG/JPEG/WebP, ≤ 5 MB |
| `tenants/{id}/documents/**` | `SETTINGS_MANAGE` | `SETTINGS_MANAGE` | PDF or image, ≤ 10 MB |
| `tenants/{id}/invoices/**` | `FINANCIAL_READ` | `FINANCIAL_MANAGE` | PDF or image, ≤ 10 MB |
| `tenants/{id}/employees/**` | `STAFF_MANAGE` | `STAFF_MANAGE` | PDF or image, ≤ 10 MB |

SVG is rejected (can carry scripts). Public branding and menu images are world-readable by design, because they appear on public websites; do not store private files there.
MIME type in rules is client-declared; add server-side content sniffing before relying on it for untrusted uploads.

## Billing constraint
Since 3 February 2026, Cloud Storage for Firebase requires the Blaze (pay-as-you-go) plan even for free-tier usage. This conflicts with the project rule "no Blaze without approval". The rules and tests exist, but **nothing can be uploaded to a real bucket until that decision is made**. The local emulator works without Blaze.
