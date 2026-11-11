import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CacheManagement } from "./cache-management";

const { auth } = vi.hoisted(() => ({ auth: { isLoading: false, user: { isSuperAdmin: false } } }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => auth }));

describe("cache management", () => {
  beforeEach(() => {
    auth.isLoading = false;
    auth.user.isSuperAdmin = false;
    vi.restoreAllMocks();
  });
  it("hides actions from ordinary admins", () => {
    render(<CacheManagement />);
    expect(screen.getByRole("alert")).toHaveTextContent("controlPanel.cacheManagement.notAllowed");
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
  it("waits for the session before showing actions", () => {
    auth.isLoading = true;
    render(<CacheManagement />);
    expect(screen.getByRole("status")).toHaveTextContent("controlPanel.cacheManagement.loading");
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
  it("refreshes the selected cache and reports the result", async () => {
    auth.user.isSuperAdmin = true;
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    render(<CacheManagement />);
    await userEvent.click(
      screen.getByRole("button", { name: "controlPanel.cacheManagement.parks.button" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/cache",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ scope: "parks" }) }),
    );
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("controlPanel.cacheManagement.success"),
    );
  });
  it.each(["response", "network"])("reports %s failures", async (failure) => {
    auth.user.isSuperAdmin = true;
    const fetchMock = vi.spyOn(globalThis, "fetch");
    if (failure === "network") fetchMock.mockRejectedValueOnce(new Error("offline"));
    else fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
    render(<CacheManagement />);
    await userEvent.click(
      screen.getByRole("button", { name: "controlPanel.cacheManagement.home.button" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "controlPanel.cacheManagement.error",
    );
  });
});
