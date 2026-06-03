import { apiFetch } from "@/lib/api";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type AuthUser, useAuth } from "./use-auth";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

describe("useAuth", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads the authenticated user state from the auth endpoint", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      id: "user-1",
      email: "user@example.com",
      name: "Test User",
      picture: "https://example.com/user.png",
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(apiFetch).toHaveBeenCalledWith("/auth/me");
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual({
      id: "user-1",
      email: "user@example.com",
      name: "Test User",
      picture: "https://example.com/user.png",
    });
  });

  it("falls back to a signed-out state when the auth request fails", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("offline"));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("does not update state after unmount when the auth request resolves later", async () => {
    let resolveUser: ((value: AuthUser) => void) | undefined;

    vi.mocked(apiFetch).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveUser = resolve;
        }),
    );

    const { result, unmount } = renderHook(() => useAuth());

    unmount();
    if (resolveUser) {
      resolveUser({
        id: "user-1",
        email: "user@example.com",
        name: "Test User",
        picture: "https://example.com/user.png",
      });
    }
    await Promise.resolve();

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it("does not update state after unmount when the auth request rejects later", async () => {
    let rejectUser: ((error?: unknown) => void) | undefined;

    vi.mocked(apiFetch).mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectUser = reject;
        }),
    );

    const { result, unmount } = renderHook(() => useAuth());

    unmount();
    if (rejectUser) {
      rejectUser(new Error("offline"));
    }
    await Promise.resolve();

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it("posts logout through the auth endpoint", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      id: "user-1",
      email: "user@example.com",
      name: "Test User",
      picture: "https://example.com/user.png",
    });
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.logout().catch(() => undefined);

    expect(apiFetch).toHaveBeenNthCalledWith(2, "/auth/logout", { method: "POST" });
  });
});
