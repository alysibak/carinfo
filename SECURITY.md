# Security policy

## Reporting a vulnerability

Please report security issues privately through GitHub: open the repository's
**Security** tab and choose **Report a vulnerability**. Do not open a public
issue for anything exploitable.

Include what you found, how to reproduce it, and the impact you expect.

## Scope

In scope: the API (`/api/*`), the server-rendered pages, account and garage
data, and billing flows. Vehicle specifications and estimates being wrong is a
data-quality bug, not a security issue; open a normal issue for those.

## Deployment notes for operators

- Set `DATABASE_SSL=verify` in production. Unset means TLS without certificate
  verification, which is only safe on a trusted network.
- Set `APP_ORIGIN` (and `SITE_URL`). Without it the CORS allowlist holds only
  the deployment's own Vercel URL (or localhost), and Stripe Checkout refuses
  to start rather than guess a return URL.
- Never set `DISABLE_RATE_LIMIT` outside tests.
