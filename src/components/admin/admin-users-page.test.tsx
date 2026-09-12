import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminUsersPage } from "./admin-users-page";

const { authState } = vi.hoisted(() => ({
  authState: {
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
    user: {
      email: "admin@example.com",
      id: "admin-sub",
      isSuperAdmin: false,
      name: "Admin",
      picture: "",
    },
  },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => authState,
}));

vi.mock("@/components/admin/admin-invitation-form", () => ({
  AdminInvitationForm: () => <div data-testid="admin-invitation-form" />,
}));

vi.mock("@/components/admin/admin-user-list", () => ({
  AdminUserList: () => <div data-testid="admin-user-list" />,
}));

describe("AdminUsersPage", () => {
  beforeEach(() => {
    authState.isLoading = false;
    authState.user.isSuperAdmin = false;
  });

  it("shows a loading status while the session is being resolved", () => {
    authState.isLoading = true;

    render(<AdminUsersPage />);

    expect(screen.getByRole("status")).toHaveTextContent("controlPanel.adminUsers.loading");
  });

  it("hides admin management from normal admins", () => {
    render(<AdminUsersPage />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "controlPanel.adminUsers.errors.notAllowed",
    );
    expect(screen.queryByTestId("admin-user-list")).toBeNull();
  });

  it("shows the invitation form and admin list to super admins", () => {
    authState.user.isSuperAdmin = true;

    render(<AdminUsersPage />);

    expect(
      screen.getByRole("heading", { name: "controlPanel.adminUsers.title" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("admin-invitation-form")).toBeInTheDocument();
    expect(screen.getByTestId("admin-user-list")).toBeInTheDocument();
  });
});
