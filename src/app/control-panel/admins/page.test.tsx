import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminsPage, { generateMetadata } from "./page";

vi.mock("@/components/admin/admin-users-page", () => ({
  AdminUsersPage: () => <div data-testid="admin-users-page" />,
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async (namespace: string) => (key: string) => `${namespace}.${key}`),
}));

vi.mock("@/lib/page-metadata", () => ({
  buildPageMetadata: vi.fn((title: string, siteTitle: string) => ({ title, siteTitle })),
}));

describe("AdminsPage", () => {
  it("renders the admin users page", async () => {
    render(await AdminsPage());

    expect(screen.getByTestId("admin-users-page")).toBeInTheDocument();
  });

  it("builds metadata from the admin users translation", async () => {
    await expect(generateMetadata()).resolves.toEqual({
      siteTitle: "metadata.title",
      title: "controlPanel.adminUsers.title",
    });
  });
});
