import { apiFetch } from "@/lib/api";
import type { ParkDetail } from "@/lib/parks";
import { revalidatePublicCache } from "@/lib/public-cache";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ParkForm } from "./park-form";

const replaceMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/public-cache", () => ({
  revalidatePublicCache: vi.fn(async () => true),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    refresh: refreshMock,
    push: vi.fn(),
  }),
}));

const park = {
  slug: "pallas",
  name: "Pallas-Yllästunturi",
  areaKm2: 14,
  displayTypeName: "Maailmanperintökohde",
  location: "Lappi",
  logo: null,
  luontoonUrl: "https://example.com/pallas",
  map: null,
  establishmentYear: 1938,
  boundingBox: { minLat: 67, minLon: 23, maxLat: 68, maxLon: 25 },
  markerPoint: { lat: 67.5, lon: 24 },
  category: { name: "Kansallispuistot", slug: "national-park" },
  type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" },
  catalogStatus: "active",
  lipasId: 123,
  municipalityCode: 12,
  postalOffice: "Muonio",
  sourceEventDate: null,
  updatedAt: "2024-01-01T00:00:00.000Z",
} satisfies ParkDetail;

describe("ParkForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits the edited park details and redirects to the updated edit route", async () => {
    const user = userEvent.setup();

    vi.mocked(apiFetch).mockResolvedValueOnce({
      ...park,
      name: "Pallas-Yllästunturin kansallispuisto",
      slug: "pallas-yllastunturi",
    });

    render(<ParkForm park={park} />);

    await user.clear(screen.getByLabelText(/controlPanel\.parks\.edit\.form\.nameLabel/));
    await user.type(
      screen.getByLabelText(/controlPanel\.parks\.edit\.form\.nameLabel/),
      "Pallas-Yllästunturin kansallispuisto",
    );
    await user.clear(screen.getByLabelText(/controlPanel\.parks\.edit\.form\.slugLabel/));
    await user.type(
      screen.getByLabelText(/controlPanel\.parks\.edit\.form\.slugLabel/),
      "pallas-yllastunturi",
    );
    await user.click(screen.getByRole("button", { name: "controlPanel.parks.edit.form.submit" }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/api/parks/pallas", {
        method: "PATCH",
        body: JSON.stringify({
          name: "Pallas-Yllästunturin kansallispuisto",
          slug: "pallas-yllastunturi",
        }),
      });
    });

    expect(revalidatePublicCache).toHaveBeenCalledWith({ parkSlug: "pallas" });
    expect(revalidatePublicCache).toHaveBeenCalledWith({ parkSlug: "pallas-yllastunturi" });
    expect(replaceMock).toHaveBeenCalledWith(
      "/control-panel/parks/pallas-yllastunturi/edit?updated=1",
    );
    expect(refreshMock).toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "controlPanel.parks.edit.form.submit" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "..." })).not.toBeInTheDocument();
  });

  it("shows validation errors for missing required fields", async () => {
    const user = userEvent.setup();

    render(<ParkForm park={park} />);

    await user.clear(screen.getByLabelText(/controlPanel\.parks\.edit\.form\.nameLabel/));
    await user.clear(screen.getByLabelText(/controlPanel\.parks\.edit\.form\.slugLabel/));
    await user.clear(screen.getByLabelText(/controlPanel\.parks\.edit\.form\.locationLabel/));
    await user.click(screen.getByRole("button", { name: "controlPanel.parks.edit.form.submit" }));

    expect(
      await screen.findByText("controlPanel.parks.edit.form.validation.nameRequired"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("controlPanel.parks.edit.form.validation.slugRequired"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("controlPanel.parks.edit.form.validation.locationRequired"),
    ).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("sends cleared optional fields as null and does not revalidate a second slug when it stays the same", async () => {
    const user = userEvent.setup();

    vi.mocked(apiFetch).mockResolvedValueOnce({
      ...park,
      displayTypeName: null,
      luontoonUrl: null,
      areaKm2: null,
      establishmentYear: null,
      postalOffice: null,
    });

    render(<ParkForm park={park} />);

    await user.clear(
      screen.getByLabelText(/controlPanel\.parks\.edit\.form\.displayTypeNameLabel/),
    );
    await user.clear(screen.getByLabelText(/controlPanel\.parks\.edit\.form\.luontoonUrlLabel/));
    await user.clear(screen.getByLabelText(/controlPanel\.parks\.edit\.form\.areaLabel/));
    await user.clear(screen.getByLabelText(/controlPanel\.parks\.edit\.form\.establishedLabel/));
    await user.clear(screen.getByLabelText(/controlPanel\.parks\.edit\.form\.postalOfficeLabel/));
    await user.type(
      screen.getByLabelText(/controlPanel\.parks\.edit\.form\.postalCodeLabel/),
      "48100",
    );

    await user.click(screen.getByRole("button", { name: "controlPanel.parks.edit.form.submit" }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/parks/pallas",
        expect.objectContaining({
          method: "PATCH",
        }),
      );
    });

    const [, requestOptions] = vi.mocked(apiFetch).mock.calls[0] ?? [];
    expect(JSON.parse(String(requestOptions?.body))).toEqual({
      areaKm2: null,
      displayTypeName: null,
      establishmentYear: null,
      luontoonUrl: null,
      postalCode: "48100",
      postalOffice: null,
    });
    expect(revalidatePublicCache).toHaveBeenCalledTimes(1);
    expect(revalidatePublicCache).toHaveBeenCalledWith({ parkSlug: "pallas" });
  });

  it("does not submit when nothing changed", async () => {
    const user = userEvent.setup();

    render(<ParkForm park={park} />);

    await user.click(screen.getByRole("button", { name: "controlPanel.parks.edit.form.submit" }));

    expect(apiFetch).not.toHaveBeenCalled();
    expect(revalidatePublicCache).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("sends a changed location label in the update payload", async () => {
    const user = userEvent.setup();

    vi.mocked(apiFetch).mockResolvedValueOnce({
      ...park,
      location: "Kittila",
    });

    render(<ParkForm park={park} />);

    await user.clear(screen.getByLabelText(/controlPanel\.parks\.edit\.form\.locationLabel/));
    await user.type(
      screen.getByLabelText(/controlPanel\.parks\.edit\.form\.locationLabel/),
      " Kittila ",
    );
    await user.click(screen.getByRole("button", { name: "controlPanel.parks.edit.form.submit" }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/api/parks/pallas", {
        method: "PATCH",
        body: JSON.stringify({
          locationLabel: "Kittila",
        }),
      });
    });
  });

  it("shows validation errors for invalid optional number fields", async () => {
    const user = userEvent.setup();

    render(<ParkForm park={park} />);

    await user.clear(screen.getByLabelText(/controlPanel\.parks\.edit\.form\.establishedLabel/));
    await user.type(
      screen.getByLabelText(/controlPanel\.parks\.edit\.form\.establishedLabel/),
      "2024.5",
    );

    await user.click(screen.getByRole("button", { name: "controlPanel.parks.edit.form.submit" }));

    expect(
      await screen.findByText("controlPanel.parks.edit.form.validation.establishedInvalid"),
    ).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("shows the API error and restores the submit button when save fails", async () => {
    const user = userEvent.setup();

    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("save failed"));

    render(<ParkForm park={park} />);

    await user.clear(screen.getByLabelText(/controlPanel\.parks\.edit\.form\.nameLabel/));
    await user.type(
      screen.getByLabelText(/controlPanel\.parks\.edit\.form\.nameLabel/),
      "Pallas-Yllästunturin kansallispuisto",
    );
    await user.click(screen.getByRole("button", { name: "controlPanel.parks.edit.form.submit" }));

    expect(await screen.findByText("save failed")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "controlPanel.parks.edit.form.submit" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "..." })).not.toBeInTheDocument();
  });
});
