# Deployment Guide

## Overview

This frontend is designed to run on Vercel with a separate backend API.

Production env vars required by the frontend:

```env
NEXT_PUBLIC_API_URL=https://reissuvihko-api.vercel.app
API_KEY=your-backend-api-key
AUTH_JWT_SECRET=the-same-secret-as-backend
NEXT_PUBLIC_SITE_URL=https://reissuvihko.vercel.app

# Optional
AUTH_COOKIE_NAME=__session
NEXT_PUBLIC_MAP_STYLE_URL=https://demotiles.maplibre.org/style.json
```

## Search discovery and Google Search Console

Set `NEXT_PUBLIC_SITE_URL` to the preferred public origin (use your custom domain if applicable) and redeploy. Metadata, canonical links, and the sitemap share this origin. Without it, the app uses `VERCEL_PROJECT_PRODUCTION_URL`, then `VERCEL_URL`, then localhost. Redirect secondary domains to the preferred domain in Vercel; canonical links do not perform redirects.

- `/robots.txt` advertises `/sitemap.xml` and allows public pages and rendering assets. API/auth paths are excluded from crawling.
- `/sitemap.xml` reads the anonymous-user catalogue and all trip archive pages through the server-side API client, without session cookies. It is generated on request with no-store reads, excludes admin/login/tokenized share URLs, and fails on upstream errors instead of returning a misleading partial sitemap. It does not emit guessed modification dates or signed media URLs. A dedicated lightweight API sitemap feed should replace archive pagination if the catalogue grows enough to approach function time limits or 50,000 URLs.
- Public pages have Finnish descriptions and canonical URLs without UI filter query parameters. Missing/hidden park fallback metadata is noindex. Login, admin, offline, and tokenized share responses carry `X-Robots-Tag: noindex, nofollow`; these pages remain crawlable so crawlers can read the directive. Vercel previews receive the same header globally. These rules do not replace authentication.
- Keep `public/googleff9155aacaf6c1d0.html` deployed after ownership verification.

After deploying:

1. Open `/googleff9155aacaf6c1d0.html`, `/robots.txt`, and `/sitemap.xml` on the preferred production domain. Check successful responses and that all sitemap URLs use that domain.
2. Complete ownership verification in Google Search Console and submit `sitemap.xml`.
3. Use URL Inspection's live test on the homepage, a park, and a trip; confirm crawling is allowed, content is rendered, and canonical URLs are correct. Request indexing for these representative pages.
4. Monitor sitemap processing and Page indexing reports for exclusions and server errors. Deployment does not guarantee indexing or ranking.

For AI search discovery, follow the same crawlability, descriptive content, and internal-link foundations. Google does not require special AI files or schema for its AI search features. See [Google's AI search guidance](https://developers.google.com/search/docs/appearance/ai-features) and [canonical URL guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls). Future structured data must describe visible facts; do not invent reviews, authorship, or travel claims.

The homepage emits `WebSite` JSON-LD with the existing site name, visible introductory summary, Finnish language, and canonical origin. It uses a native script with JSON text, escaping `<` so translated strings cannot terminate the script; no raw HTML injection is used. Page-specific Open Graph metadata explicitly retains the site name and Finnish locale because Next.js replaces nested metadata objects. See [Google's site-name guidance](https://developers.google.com/search/docs/appearance/site-names).

The wildcard robots rule already allows `OAI-SearchBot` on public pages. OpenAI distinguishes this search crawler from user-triggered `ChatGPT-User` fetches and the training crawler `GPTBot`; direct-URL retrieval is not proof of search discovery. After deployment, inspect Vercel firewall/bot-protection logs for rejected crawler requests and use OpenAI's published IP ranges when evaluating actual crawler access. A spoofed user-agent test alone does not prove access from those IPs. Search visibility and training preferences are separate decisions. See [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots).

## How frontend auth works in production

- Public page data is fetched server-side from the backend.
- Browser auth requests such as `/auth/me` and `/auth/logout` are proxied through Next.js route handlers.
- Browser admin write requests are also proxied through Next.js route handlers.
- Browser park search requests are also proxied through Next.js route handlers.
- The OAuth start and callback routes are proxied through the frontend host so the session cookie can be stored on the frontend domain.

## Current PWA note

Production builds register the Serwist service worker. Development keeps registration disabled so local iteration does not get polluted by stale caches.

When validating a deployment, include one real browser pass for:

- successful service worker registration
- offline document fallback at `/~offline`
- refresh behavior after a new deployment
- public-page freshness after admin mutations trigger cache revalidation

## Important domain rule

If you use only the default `*.vercel.app` URLs for both frontend and backend, you cannot share cookies at the `vercel.app` level.

That means the safe production setup is:

- Frontend on your real site domain, for example `reissuvihko.fi` or `app.reissuvihko.fi`
- Backend on a sibling custom domain, for example `api.reissuvihko.fi`
- Backend cookie should stay host-only unless you intentionally configure a shared parent domain

The frontend proxy routes in this repo avoid sending the backend cookie directly to the browser origin, but OAuth callback and session behavior are still simplest and most predictable when you use your own domain instead of relying on two separate `vercel.app` subdomains.

## Vercel project checklist

1. Import this repository as a new Vercel project.
2. Keep the framework preset as Next.js.
3. Add the production environment variables listed above.
4. Add the same variables for Preview if you want preview deployments to talk to a real backend.
5. Deploy once to get the frontend URL.
6. Add your custom frontend domain in Vercel.
7. If you want the backend under your own domain too, add that custom domain to the backend project.
8. Update backend Google OAuth settings so the authorized redirect URI points at the frontend callback URL, usually `https://your-frontend-domain/auth/google/callback`.
9. Update backend allowed origins or CORS settings if your backend restricts them.
10. Redeploy the frontend after env or domain changes.

## Backend follow-up before Google OAuth goes live

Before admin login works in production, the backend must know the frontend's real public URL for OAuth redirect and post-login redirect behavior.

Typical values you will need on the backend side:

- frontend/base app URL
- allowed frontend origin
- Google authorized redirect URI such as `https://your-frontend-domain/auth/google/callback`
- matching `AUTH_JWT_SECRET`

## Local parity

Use `.env.local` for local development. The values should mirror Vercel as closely as practical, especially:

- `AUTH_JWT_SECRET`
- `AUTH_COOKIE_NAME`
- backend base URL
