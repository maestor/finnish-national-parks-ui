# Plan: Visit Images Frontend

## Overview

Prepare the Next.js frontend for visit images without blocking on unfinished backend endpoints. The immediate goal is to ship the frontend seams that are safe now, keep the current visit flow moving, and avoid introducing assumptions that will be expensive to unwind once the backend contract lands.

## Status Snapshot

### Done now

- Frontend plan written and aligned with the current repo structure.
- API client made safe for future `multipart/form-data` uploads.
- Shared visit types extended so the UI can accept `visit.images` once the backend starts returning it.
- New visit creation now redirects into the edit flow, which is the right insertion point for image upload.
- Public visit UI has an image gallery seam ready to light up when image metadata arrives.
- Repo docs now clarify the legacy `/api/me/*` naming and the real access rule: all `GET` endpoints are public-readable, while non-`GET` endpoints require authenticated admin access.

### Still blocked on backend

- Upload endpoint: `POST /api/me/visits/{id}/images`
- Delete endpoint: `DELETE /api/me/visits/{id}/images/{imageId}`
- Visit responses enriched with `images`
- Final response shape for partial upload success

### Remaining frontend work after backend readiness

- Show persisted images on edit and park views from real API data
- Add upload UI to the edit page
- Add deletion controls for existing images
- Consider reorder later if it still feels necessary after upload/delete is stable

## Review Notes For The Backend Plan

### 1. Make the upload response explicitly per-file

The backend plan says `POST /api/me/visits/{id}/images` returns an array of images, but it also requires partial success with per-file errors. Those two ideas conflict. The frontend uploader will need a stable result shape such as:

```ts
{
  results: [
    {
      clientUploadId: string;
      status: "uploaded" | "failed";
      image?: VisitImage;
      error?: string;
    }
  ];
}
```

Without that, the UI cannot reliably match server results back to individual queued files.

### 2. Include `images` everywhere a visit is returned

The current frontend edit and list views derive visits from `GET /api/me/parks`, not only from park-detail responses. The backend contract should therefore add `images` to the shared visit schema everywhere it appears, including:

- `GET /api/me/parks`
- `GET /api/me/parks/{slug}`
- any future single-visit responses

If image data exists only on park-detail responses, the edit page will need an extra fetch that is unnecessary today.

### 3. Separate metadata caching from asset caching

The backend plan says to keep `Cache-Control: private, no-store` on visit image metadata routes, but the same plan serves image files from a public R2 bucket URL. Those headers can protect JSON metadata responses, but they will not meaningfully control cache behavior for direct bucket asset URLs. The cleaner split is:

- visit metadata responses: `private, no-store`
- immutable image object URLs: long-lived cache headers

If stronger privacy is needed later, switch delivery to proxied or presigned URLs instead of relying on cache headers alone.

## Current Frontend Reality

- Visit creation currently begins from [`VisitForm`](/Users/maestor/Projects/finnish-national-parks-ui/src/components/visits/visit-form.tsx).
- New visits are created through `POST /api/me/parks/{slug}/visits`, which already returns the new visit ID.
- Edit and list views currently source visit data from `GET /api/me/parks`.
- Backend naming caveat: in this app, `/api/me/*` is legacy naming only. All `GET` endpoints are public-readable, while non-`GET` endpoints require authenticated admin access.
- The repo does not use React Query or SWR today, so image refresh should continue to use local component state plus `router.refresh()` rather than introducing a new data layer for this feature alone.
- The shared API client previously forced `Content-Type: application/json` for every request, which would have broken multipart uploads.

## Frontend Work Completed Now

### 1. Multipart-safe API client

`src/lib/api.ts` now leaves `Content-Type` unset for `FormData` bodies so the browser can provide the correct multipart boundary for future image uploads.

### 2. Image-ready visit types

`src/lib/parks.ts` now supports optional `visit.images` metadata locally. This keeps the frontend additive and compatible with the current generated OpenAPI types while making image-aware components possible before regeneration.

### 3. New-visit flow now lands on edit

After creating a visit, the UI now redirects to `/control-panel/visits/{id}/edit?created=1` instead of returning straight to the list. This is the right insertion point for image upload once backend endpoints are ready.

### 4. Image display seam

The visit accordion can now render visit images when `visit.images` exists. The lightbox/gallery behavior is in place, but it remains dormant until the backend starts returning image metadata.

### 5. Route naming confusion documented

The frontend docs now state the real contract explicitly: `/api/me/*` is legacy naming only in this app, all `GET` endpoints are public-readable, and only non-`GET` endpoints require authenticated admin access.

## Backend Contract Needed Before Upload UI

The frontend should wait for these backend pieces before wiring the uploader:

1. `POST /api/me/visits/{id}/images`
2. `DELETE /api/me/visits/{id}/images/{imageId}`
3. visit payloads that include `images`
4. a final upload response schema for partial success

There is no further must-do frontend implementation work before those pieces exist. Anything else now would mostly be placeholder UI or guesswork against an unfinished contract.

## Frontend Rollout After Backend Readiness

### Phase 1. Show persisted images on edit and park views

- Reuse the shipped gallery component with real API data.
- Render existing images in the edit view alongside visit details.

### Phase 2. Add upload UI to the edit page

- Add `VisitImageUploader` as a client component on the edit page.
- Use `FormData` with one or more files plus optional client upload IDs.
- Keep local preview state in the uploader and call `router.refresh()` after upload completion.

### Phase 3. Add deletion

- Add remove buttons per image in the edit page only.
- Confirm deletion and optimistically remove the image from local state before refresh.

### Phase 4. Consider reorder only after basic upload/delete feels good

- Do not add drag-and-drop in the first frontend slice.
- If ordering is needed later, prefer `@dnd-kit`.

## Suggested Frontend Dependencies Later

Wait to add these until the backend contract is stable:

- `react-dropzone` for file picking
- client-side compression helper if large mobile uploads are painful in practice

The gallery/lightbox portion does not need extra dependencies right now.
