import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostLoginReturnRedirector } from "./post-login-return-redirector";

const { authState, navigationState } = vi.hoisted(() => ({
  authState: {
    isAuthenticated: false,
    isLoading: true,
  },
  navigationState: {
    pathname: "/control-panel",
    replace: vi.fn(),
  },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => authState,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
  useRouter: () => ({ replace: navigationState.replace }),
}));

describe("PostLoginReturnRedirector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.isAuthenticated = false;
    authState.isLoading = true;
    navigationState.pathname = "/control-panel";
    window.sessionStorage.clear();
  });

  it("redirects authenticated users back to the stored page from control-panel root", async () => {
    authState.isAuthenticated = true;
    authState.isLoading = false;
    window.sessionStorage.setItem("post-login-redirect-path", "/park/pallas");

    render(<PostLoginReturnRedirector />);

    await waitFor(() => {
      expect(navigationState.replace).toHaveBeenCalledWith("/paikka/pallas");
    });
    expect(window.sessionStorage.getItem("post-login-redirect-path")).toBeNull();
  });

  it("does not redirect while auth is loading or outside control-panel root", async () => {
    authState.isAuthenticated = true;
    authState.isLoading = false;
    navigationState.pathname = "/control-panel/visits";
    window.sessionStorage.setItem("post-login-redirect-path", "/park/pallas");

    render(<PostLoginReturnRedirector />);

    await waitFor(() => {
      expect(navigationState.replace).not.toHaveBeenCalled();
    });
    expect(window.sessionStorage.getItem("post-login-redirect-path")).toBe("/park/pallas");
  });
});
