import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listAdminUsers, removeAdminUser, updateAdminUser } from "@/lib/admin-users";
import { ApiError } from "@/lib/api";
import { AdminUserList } from "./admin-user-list";

const { authState } = vi.hoisted(() => ({
  authState: {
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
    user: {
      email: "super@example.com",
      id: "super-sub",
      isSuperAdmin: true,
      name: "Super",
      picture: "",
    },
  },
}));

const { translate } = vi.hoisted(() => ({
  translate: (key: string) => key,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => translate,
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => authState,
}));

vi.mock("@/lib/admin-users", () => ({
  listAdminUsers: vi.fn(),
  removeAdminUser: vi.fn(),
  updateAdminUser: vi.fn(),
}));

const admins = [
  {
    createdAt: "2026-09-12T10:00:00.000Z",
    email: "normal@example.com",
    id: 2,
    isEnrolled: true,
    isSuperAdmin: false,
    updatedAt: "2026-09-12T10:00:00.000Z",
  },
  {
    createdAt: "2026-09-12T10:00:00.000Z",
    email: "super@example.com",
    id: 1,
    isEnrolled: true,
    isSuperAdmin: true,
    updatedAt: "2026-09-12T10:00:00.000Z",
  },
];

describe("AdminUserList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listAdminUsers).mockResolvedValue({ admins });
  });

  it("lists admins and only offers controls for other accounts", async () => {
    render(<AdminUserList />);

    await waitFor(() => expect(listAdminUsers).toHaveBeenCalledOnce());

    expect(screen.getByRole("row", { name: /super@example.com/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "upgrade" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "remove" })).toBeInTheDocument();
    expect(screen.getByText(/\(currentUser\)/)).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("updates another admin role and removes that account after confirmation", async () => {
    const upgradedAdmin = { ...admins[0], isSuperAdmin: true };
    vi.mocked(updateAdminUser).mockResolvedValueOnce(upgradedAdmin);
    vi.mocked(removeAdminUser).mockResolvedValueOnce(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<AdminUserList />);
    await waitFor(() => expect(listAdminUsers).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole("button", { name: "upgrade" }));
    await waitFor(() => expect(updateAdminUser).toHaveBeenCalledWith(2, { isSuperAdmin: true }));
    expect(screen.getAllByText("superAdminRole")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "remove" }));
    await waitFor(() => expect(removeAdminUser).toHaveBeenCalledWith(2));
    await waitFor(() => expect(screen.queryByText("normal@example.com")).toBeNull());
  });

  it("shows a safe error when loading fails", async () => {
    vi.mocked(listAdminUsers).mockRejectedValueOnce(new ApiError(503, "offline"));

    render(<AdminUserList />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("errors.list");
    });
  });
});
