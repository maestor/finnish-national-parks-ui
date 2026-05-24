# Deployment Guide

## Overview

This frontend is designed to run on Vercel with a separate backend API.

Production env vars required by the frontend:

```env
NEXT_PUBLIC_API_URL=https://reissuvihko-api.vercel.app
API_KEY=your-backend-api-key
AUTH_JWT_SECRET=the-same-secret-as-backend

# Optional
AUTH_COOKIE_NAME=__session
NEXT_PUBLIC_MAP_STYLE_URL=https://demotiles.maplibre.org/style.json
```

## How frontend auth works in production

- Public page data is fetched server-side from the backend.
- Browser auth requests such as `/auth/me` and `/auth/logout` are proxied through Next.js route handlers.
- Browser admin write requests are also proxied through Next.js route handlers.
- The OAuth start and callback routes are proxied through the frontend host so the session cookie can be stored on the frontend domain.

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
