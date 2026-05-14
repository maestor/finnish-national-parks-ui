# Plan: Visit Images Frontend

## Overview

Prepare the Next.js frontend for visit images without blocking on unfinished backend endpoints. The immediate goal is to ship the frontend seams that are safe now, keep the current visit flow moving, and avoid introducing assumptions that will be expensive to unwind once the backend contract lands.

## Status Snapshot

### Done now

- Frontend plan written and aligned with the current repo structure.
- API client made safe for future `multipart/form-data` uploads.
- Shared visit types extended so the UI can accept `visit.images` once the backend starts returning it.
- New visit creation now redirects into the edit flow, which is the right insertion point for image upload.
- Public visit UI now renders persisted visit images with a horizontally scrolling thumbnail rail and centered lightbox.
- Repo docs now clarify the legacy `/api/me/*` naming and the real access rule: all `GET` endpoints are public-readable, while non-`GET` endpoints require authenticated admin access.
- API types regenerated from the backend OpenAPI spec; `VisitImage` is now derived from the generated contract.
- `VisitImageSection` component added to the edit page with file upload, delete, and button-based reorder functionality.
- Finnish translations added for image upload and delete UI.
- Tests added for `VisitImageSection`.
- Gallery and lightbox styling polished for the public park page, including centered thumbnails, conditional rail arrows, and a dark-mode-safe close button.
- Park visit details now place the author section below images.

### Remaining frontend work

- Keep drag-and-drop out of the first frontend slice unless button-based reorder proves too clumsy in production.
- Add client-side image compression later if large mobile uploads are painful in practice.

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

The visit accordion now renders real visit images from API data. The public park page uses a horizontal thumbnail rail, conditional scroll controls, and a centered lightbox overlay that behaves correctly in dark mode.

### 5. Route naming confusion documented

The frontend docs now state the real contract explicitly: `/api/me/*` is legacy naming only in this app, all `GET` endpoints are public-readable, and only non-`GET` endpoints require authenticated admin access.

## Backend Contract Status

The backend contract is now wired into the frontend:

1. ✅ `POST /api/me/visits/{id}/images` — used by `VisitImageSection`
2. ✅ `DELETE /api/me/visits/{visitId}/images/{imageId}` — used by `VisitImageSection`
3. ✅ visit payloads include `images` — reflected in regenerated `api-types.ts`
4. ✅ upload response shape — `{ images: VisitImage[], errors: { originalName, reason }[] }`

## Frontend Rollout (Completed)

### Phase 1. Show persisted images on edit and park views ✅

- `VisitAccordion` and `VisitImageGallery` now render real `visit.images` from API data.
- Edit page displays existing images via `VisitImageSection`.

### Phase 2. Add upload UI to the edit page ✅

- `VisitImageSection` handles file selection, previews, and upload via `FormData`.
- Calls `router.refresh()` after successful upload.
- Shows per-file and backend error messages.

### Phase 3. Add deletion ✅

- Remove button on each image in the edit page with confirmation.
- Optimistic removal from local state before refresh.

### Phase 4. Add basic reorder controls ✅

- Button-based left/right reorder is now in place on the edit page.
- Drag-and-drop remains intentionally deferred.

### Phase 5. Consider drag-and-drop later

- Do not add drag-and-drop in the first frontend slice.
- If richer ordering is still needed later, prefer `@dnd-kit`.

## Suggested Frontend Dependencies Later

Wait to add these until the backend contract is stable:

- `react-dropzone` for file picking
- client-side compression helper if large mobile uploads are painful in practice

The gallery/lightbox portion does not need extra dependencies right now.
