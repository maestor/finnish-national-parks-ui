import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminParkMap } from "./admin-park-map";

const mockParkMap = vi.fn();

vi.mock("@/components/map/park-map", () => ({
  ParkMap: (props: Record<string, unknown>) => mockParkMap(props),
}));

const apiFetchMock = vi.fn<(...args: unknown[]) => Promise<unknown>>(() =>
  Promise.resolve(undefined),
);

vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

const revalidatePublicCacheMock = vi.fn<(...args: unknown[]) => Promise<unknown>>(() =>
  Promise.resolve(true),
);

vi.mock("@/lib/public-cache", () => ({
  revalidatePublicCache: (...args: unknown[]) => revalidatePublicCacheMock(...args),
}));

const basePark = {
  slug: "pallas",
  name: "Pallas-Yllästunturin kansallispuisto",
  areaKm2: 1020,
  location: "Lappi",
  logo: null,
  luontoonUrl: null,
  map: null,
  category: { name: "Kansallispuistot", slug: "national-park" as const },
  establishmentYear: 1938,
  boundingBox: { minLat: 67, minLon: 23, maxLat: 68, maxLon: 24 },
  markerPoint: { lat: 67.5, lon: 23.5 },
  type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" as const },
};

const removedPark = {
  slug: "removed-park",
  name: "Removed Park",
  areaKm2: 100,
  location: "Etelä-Suomi",
  logo: null,
  luontoonUrl: null,
  map: null,
  category: { name: "Erämaa- ja retkeilyalueet", slug: "hiking-and-wilderness-areas" as const },
  establishmentYear: 2000,
  boundingBox: { minLat: 60, minLon: 24, maxLat: 61, maxLon: 25 },
  markerPoint: { lat: 60.5, lon: 24.5 },
  type: { code: 2, id: 2, name: "Retkeilyalue", slug: "hiking-area" as const },
};

describe("AdminParkMap", () => {
  beforeEach(() => {
    mockParkMap.mockReset();
    apiFetchMock.mockReset().mockResolvedValue(undefined);
    revalidatePublicCacheMock.mockReset().mockResolvedValue(true);
    mockParkMap.mockReturnValue(<div data-testid="park-map" />);
  });

  it("passes all parks to ParkMap with correct removed slugs", () => {
    render(<AdminParkMap parks={[basePark]} removedParks={[removedPark]} />);

    const lastCall = mockParkMap.mock.calls[mockParkMap.mock.calls.length - 1]?.[0];
    expect(lastCall.parks).toHaveLength(2);
    expect(lastCall.removedSlugs).toEqual(new Set(["removed-park"]));
    expect(lastCall.canManageVisits).toBe(true);
  });

  it("calls API and optimistically moves park to removed list when toggle hide is triggered", async () => {
    window.confirm = vi.fn(() => true);

    render(<AdminParkMap parks={[basePark]} removedParks={[removedPark]} />);

    const initialCall = mockParkMap.mock.calls[mockParkMap.mock.calls.length - 1]?.[0];
    expect(initialCall.removedSlugs.has("pallas")).toBe(false);

    const onToggleRemoved = initialCall.onToggleRemoved as (slug: string, removed: boolean) => void;

    act(() => {
      onToggleRemoved("pallas", true);
    });

    await waitFor(() => {
      const lastCall = mockParkMap.mock.calls[mockParkMap.mock.calls.length - 1]?.[0];
      expect(lastCall.removedSlugs.has("pallas")).toBe(true);
    });

    expect(apiFetchMock).toHaveBeenCalledWith("/api/parks/pallas/removed", {
      method: "PATCH",
      body: JSON.stringify({ removed: true }),
    });
    expect(revalidatePublicCacheMock).toHaveBeenCalledWith({ parkSlug: "pallas" });
  });

  it("calls API and optimistically moves park to visible list when toggle show is triggered", async () => {
    window.confirm = vi.fn(() => true);

    render(<AdminParkMap parks={[basePark]} removedParks={[removedPark]} />);

    const initialCall = mockParkMap.mock.calls[mockParkMap.mock.calls.length - 1]?.[0];
    expect(initialCall.removedSlugs.has("removed-park")).toBe(true);

    const onToggleRemoved = initialCall.onToggleRemoved as (slug: string, removed: boolean) => void;

    act(() => {
      onToggleRemoved("removed-park", false);
    });

    await waitFor(() => {
      const lastCall = mockParkMap.mock.calls[mockParkMap.mock.calls.length - 1]?.[0];
      expect(lastCall.removedSlugs.has("removed-park")).toBe(false);
    });

    expect(apiFetchMock).toHaveBeenCalledWith("/api/parks/removed-park/removed", {
      method: "PATCH",
      body: JSON.stringify({ removed: false }),
    });
  });

  it("does not call API when user cancels the confirmation dialog", () => {
    window.confirm = vi.fn(() => false);

    render(<AdminParkMap parks={[basePark]} removedParks={[removedPark]} />);

    const initialCall = mockParkMap.mock.calls[mockParkMap.mock.calls.length - 1]?.[0];
    const onToggleRemoved = initialCall.onToggleRemoved as (slug: string, removed: boolean) => void;

    act(() => {
      onToggleRemoved("pallas", true);
    });

    expect(apiFetchMock).not.toHaveBeenCalled();
  });
});
