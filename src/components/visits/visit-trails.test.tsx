import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import type { Park, VisitWithPark } from "@/lib/parks";
import { I18nProvider } from "@/test/i18n";
import { VisitForm } from "./visit-form";
import { VisitTrailFields } from "./visit-trail-fields";

vi.unmock("next-intl");
vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/public-cache", () => ({ revalidatePublicCache: vi.fn(async () => true) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const parks = [
  { slug: "alue", name: "Alue" },
  { slug: "toinen", name: "Toinen" },
] as Park[];
const trails = [
  { trailId: 10, name: "Pitkä polku", effective: true },
  { trailId: 20, name: "Lyhyt polku", effective: true },
  { trailId: 30, name: "Poistettu polku", effective: false },
];
const areas = [
  { id: 40, name: "Aulanko", slug: "aulanko", active: true, removed: false },
  { id: 50, name: "Langinkoski", slug: "langinkoski", active: true, removed: true },
  { id: 60, name: "Vanha alue", slug: "vanha", active: false, removed: true },
];
const visit: VisitWithPark = {
  id: 1,
  park: { slug: "alue", name: "Alue" },
  visitedOn: "2026-11-12",
  author: null,
  route: "Alkuperäinen reitti",
  note: null,
  images: [],
  location: null,
  excludeFromRoute: false,
  trip: null,
  tripStopOrder: null,
  createdAt: "2026-11-12",
  updatedAt: "2026-11-12",
  trails: [{ id: 10, name: "Pitkä polku", slug: "pitka" }],
};
beforeEach(() => {
  vi.resetAllMocks();
});

it("saves selected park trails with a new visit and resets choices when the park changes", async () => {
  const user = userEvent.setup();
  vi.mocked(apiFetch).mockImplementation(async (path, options) =>
    options?.method === "POST"
      ? { id: 5 }
      : path.includes("toinen")
        ? { trails: [], areas: [] }
        : { trails, areas },
  );
  render(<VisitForm parks={parks} />, { wrapper: I18nProvider });
  await user.selectOptions(screen.getByLabelText(/^Paikka/), "alue");
  await user.click(await screen.findByRole("checkbox", { name: "Pitkä polku" }));
  await user.click(screen.getByRole("checkbox", { name: "Lyhyt polku" }));
  await user.click(screen.getByRole("checkbox", { name: "Aulanko" }));
  expect(screen.queryByRole("checkbox", { name: "Poistettu polku" })).not.toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText(/^Paikka/), "toinen");
  await waitFor(() => expect(screen.queryByRole("checkbox")).not.toBeInTheDocument());
  await user.selectOptions(screen.getByLabelText(/^Paikka/), "alue");
  expect(await screen.findByRole("checkbox", { name: "Pitkä polku" })).not.toBeChecked();
  expect(screen.getByRole("checkbox", { name: "Aulanko" })).not.toBeChecked();
  expect(screen.queryByRole("checkbox", { name: "Vanha alue" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("checkbox", { name: "Aulanko" }));
  await user.click(screen.getByRole("checkbox", { name: "Langinkoski" }));
  await user.click(screen.getByRole("checkbox", { name: "Lyhyt polku" }));
  await user.click(screen.getByRole("button", { name: "Julkaise" }));
  const request = vi.mocked(apiFetch).mock.calls.find(([, options]) => options?.method === "POST");
  expect(request?.[0]).toBe("/api/parks/alue/visits");
  expect(JSON.parse(request?.[1]?.body as string)).toMatchObject({
    trailIds: [20],
    areaIds: [40, 50],
    route: null,
  });
});

it("offers to switch a linked subarea to its main park before saving a visit", async () => {
  const user = userEvent.setup();
  vi.mocked(apiFetch).mockImplementation(async (path) =>
    path.includes("/toinen/")
      ? { trails: [], mainPark: { id: 5, slug: "alue", name: "Alue" } }
      : { trails: [], areas },
  );
  render(<VisitForm parks={parks} defaultParkSlug="toinen" />, { wrapper: I18nProvider });
  const switchPark = await screen.findByRole("button", { name: "Valitse pääalue" });
  expect(screen.getByText("Tämän alueen käynnit kirjataan pääalueelle Alue.")).toBeVisible();
  expect(screen.getByRole("button", { name: "Julkaise" })).toBeDisabled();
  await user.click(switchPark);
  expect(screen.getByLabelText(/^Paikka/)).toHaveValue("alue");
  expect(await screen.findByRole("checkbox", { name: "Aulanko" })).toBeEnabled();
});

it("lets admins clear existing trails without changing the free-text route", async () => {
  const user = userEvent.setup();
  vi.mocked(apiFetch).mockImplementation(async (_path, options) =>
    options?.method === "PATCH" ? {} : { trails, areas },
  );
  render(<VisitForm parks={parks} visitToEdit={{ ...visit, areas: [areas[2]] }} />, {
    wrapper: I18nProvider,
  });
  const checkbox = await screen.findByRole("checkbox", { name: "Pitkä polku" });
  expect(checkbox).toBeChecked();
  const save = screen.getByRole("button", { name: "Tallenna muutokset" });
  expect(save).toBeDisabled();
  await user.click(checkbox);
  const inactive = screen.getByRole("checkbox", { name: /^Vanha alue/ });
  expect(inactive).toBeChecked();
  await user.click(inactive);
  await user.click(save);
  await waitFor(() => expect(save).toBeDisabled());
  const request = vi.mocked(apiFetch).mock.calls.find(([, options]) => options?.method === "PATCH");
  expect(JSON.parse(request?.[1]?.body as string)).toMatchObject({
    trailIds: [],
    areaIds: [],
    route: "Alkuperäinen reitti",
  });
});

it("announces trail loading failure and supports retry without changing selections", async () => {
  vi.mocked(apiFetch).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ trails });
  render(
    <VisitTrailFields parkSlug="alue" selectedIds={[10]} onChange={vi.fn()} disabled={false} />,
    { wrapper: I18nProvider },
  );
  expect(screen.getByRole("status")).toHaveTextContent("Ladataan paikan reittejä");
  expect(await screen.findByRole("alert")).toHaveTextContent("lataaminen epäonnistui");
  fireEvent.click(screen.getByRole("button", { name: "Yritä reittien lataamista uudelleen" }));
  expect(await screen.findByRole("checkbox", { name: "Pitkä polku" })).toBeChecked();
});

it("ignores a late trail response after the park changes and retains unavailable selections for removal", async () => {
  let finish: (response: unknown) => void = () => {};
  vi.mocked(apiFetch)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValueOnce({ trails });
  const onChange = vi.fn();
  const view = render(
    <VisitTrailFields
      key="old"
      parkSlug="old"
      selectedIds={[]}
      onChange={onChange}
      disabled={false}
    />,
    { wrapper: I18nProvider },
  );
  view.rerender(
    <VisitTrailFields
      key="new"
      parkSlug="new"
      selectedIds={[30]}
      onChange={onChange}
      disabled={false}
    />,
  );
  fireEvent.click(await screen.findByRole("checkbox", { name: "Poistettu polku" }));
  expect(onChange).toHaveBeenCalledWith([]);
  finish({ trails: [] });
  await waitFor(() =>
    expect(screen.getByRole("checkbox", { name: "Pitkä polku" })).toBeInTheDocument(),
  );
});
