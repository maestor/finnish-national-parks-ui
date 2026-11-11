import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { ParkEditTabs } from "./park-edit-tabs";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

it("keeps unsaved details when switching tabs with keyboard or pointer", async () => {
  const user = userEvent.setup();
  render(
    <ParkEditTabs
      details={
        <label>
          Nimi
          <input />
        </label>
      }
      trails={<p>Reitit</p>}
    />,
  );
  const details = screen.getByRole("tab", { name: "details" });
  await user.type(screen.getByRole("textbox", { name: "Nimi" }), "Uusi nimi");
  details.focus();
  await user.keyboard("a");
  expect(details).toHaveAttribute("aria-selected", "true");
  await user.keyboard("{End}");
  expect(screen.getByRole("tab", { name: "trails" })).toHaveFocus();
  expect(screen.getByText("Reitit")).toBeVisible();
  await user.keyboard("{Home}");
  expect(details).toHaveFocus();
  expect(screen.getByRole("textbox", { name: "Nimi" })).toHaveValue("Uusi nimi");
  await user.click(screen.getByRole("tab", { name: "trails" }));
  expect(screen.getByRole("tab", { name: "trails" })).toHaveAttribute("aria-selected", "true");
  await user.click(details);
  expect(screen.getByRole("textbox", { name: "Nimi" })).toHaveValue("Uusi nimi");
});
