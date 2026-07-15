import { beforeEach, describe, expect, it, vi } from "vitest";

const { proxyBackendRequestMock } = vi.hoisted(() => ({
  proxyBackendRequestMock: vi.fn(async () => new Response(null, { status: 204 })),
}));

vi.mock("@/lib/backend-proxy", () => ({
  proxyBackendRequest: proxyBackendRequestMock,
}));

import { GET as getAdminParkVisibility } from "./admin/parks/visibility/route";
import { PATCH as patchParkRemoved } from "./parks/[slug]/removed/route";
import { PATCH as patchPark } from "./parks/[slug]/route";
import { POST as postParkVisit } from "./parks/[slug]/visits/route";
import { GET as getParks } from "./parks/route";
import { GET as getParkSearch } from "./parks/search/route";
import { POST as postTripPlannerSearch } from "./trip-planner/search/route";
import { DELETE as deleteVisitImage } from "./visits/[id]/images/[imageId]/route";
import { POST as postVisitImageComplete } from "./visits/[id]/images/complete/route";
import { PATCH as patchVisitImageOrder } from "./visits/[id]/images/reorder/route";
import { POST as postVisitImage } from "./visits/[id]/images/route";
import { POST as postVisitImageUploadUrl } from "./visits/[id]/images/upload-url/route";
import { DELETE as deleteVisit, PATCH as patchVisit } from "./visits/[id]/route";

describe("api proxy routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("proxies park visibility updates", async () => {
    const request = new Request("https://frontend.example/api/parks/pallas/removed", {
      method: "PATCH",
    });

    await patchParkRemoved(request, { params: Promise.resolve({ slug: "pallas" }) });

    expect(proxyBackendRequestMock).toHaveBeenCalledWith(request, "/api/parks/pallas/removed");
  });

  it("proxies park detail updates", async () => {
    const request = new Request("https://frontend.example/api/parks/pallas", {
      method: "PATCH",
    });

    await patchPark(request, { params: Promise.resolve({ slug: "pallas" }) });

    expect(proxyBackendRequestMock).toHaveBeenCalledWith(request, "/api/parks/pallas");
  });

  it("proxies admin park visibility reads", async () => {
    const request = new Request("https://frontend.example/api/admin/parks/visibility");

    await getAdminParkVisibility(request);

    expect(proxyBackendRequestMock).toHaveBeenCalledWith(request, "/api/admin/parks/visibility");
  });

  it("proxies public park listing reads", async () => {
    const request = new Request("https://frontend.example/api/parks");

    await getParks(request);

    expect(proxyBackendRequestMock).toHaveBeenCalledWith(request, "/api/parks");
  });

  it("proxies lightweight park search reads", async () => {
    const request = new Request("https://frontend.example/api/parks/search?type=national-park");

    await getParkSearch(request);

    expect(proxyBackendRequestMock).toHaveBeenCalledWith(request, "/api/parks/search");
  });

  it("proxies trip planner search requests", async () => {
    const request = new Request("https://frontend.example/api/trip-planner/search", {
      method: "POST",
    });

    await postTripPlannerSearch(request);

    expect(proxyBackendRequestMock).toHaveBeenCalledWith(request, "/api/trip-planner/search");
  });

  it("proxies visit creation for a park", async () => {
    const request = new Request("https://frontend.example/api/parks/pallas/visits", {
      method: "POST",
    });

    await postParkVisit(request, { params: Promise.resolve({ slug: "pallas" }) });

    expect(proxyBackendRequestMock).toHaveBeenCalledWith(request, "/api/parks/pallas/visits");
  });

  it("proxies visit updates", async () => {
    const request = new Request("https://frontend.example/api/visits/123", {
      method: "PATCH",
    });

    await patchVisit(request, { params: Promise.resolve({ id: "123" }) });

    expect(proxyBackendRequestMock).toHaveBeenCalledWith(request, "/api/visits/123");
  });

  it("proxies visit deletion", async () => {
    const request = new Request("https://frontend.example/api/visits/123", {
      method: "DELETE",
    });

    await deleteVisit(request, { params: Promise.resolve({ id: "123" }) });

    expect(proxyBackendRequestMock).toHaveBeenCalledWith(request, "/api/visits/123");
  });

  it("proxies visit image uploads", async () => {
    const request = new Request("https://frontend.example/api/visits/123/images", {
      method: "POST",
    });

    await postVisitImage(request, { params: Promise.resolve({ id: "123" }) });

    expect(proxyBackendRequestMock).toHaveBeenCalledWith(request, "/api/visits/123/images");
  });

  it("proxies visit image upload-url requests", async () => {
    const request = new Request("https://frontend.example/api/visits/123/images/upload-url", {
      method: "POST",
    });

    await postVisitImageUploadUrl(request, { params: Promise.resolve({ id: "123" }) });

    expect(proxyBackendRequestMock).toHaveBeenCalledWith(
      request,
      "/api/visits/123/images/upload-url",
    );
  });

  it("proxies visit image completion requests", async () => {
    const request = new Request("https://frontend.example/api/visits/123/images/complete", {
      method: "POST",
    });

    await postVisitImageComplete(request, { params: Promise.resolve({ id: "123" }) });

    expect(proxyBackendRequestMock).toHaveBeenCalledWith(
      request,
      "/api/visits/123/images/complete",
    );
  });

  it("proxies visit image deletion", async () => {
    const request = new Request("https://frontend.example/api/visits/123/images/5", {
      method: "DELETE",
    });

    await deleteVisitImage(request, {
      params: Promise.resolve({ id: "123", imageId: "5" }),
    });

    expect(proxyBackendRequestMock).toHaveBeenCalledWith(request, "/api/visits/123/images/5");
  });

  it("proxies visit image reorder", async () => {
    const request = new Request("https://frontend.example/api/visits/123/images/reorder", {
      method: "PATCH",
    });

    await patchVisitImageOrder(request, { params: Promise.resolve({ id: "123" }) });

    expect(proxyBackendRequestMock).toHaveBeenCalledWith(request, "/api/visits/123/images/reorder");
  });
});
