import { fireEvent, render as renderTestingLibrary, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SnackbarProvider } from "@/components/providers/snackbar-provider";
import { createAdminInvitation } from "@/lib/admin-invitations";
import { ApiError } from "@/lib/api";
import { AdminInvitationForm } from "./admin-invitation-form";

vi.mock("@/lib/admin-invitations", () => ({
  createAdminInvitation: vi.fn(),
}));

const render = (ui: Parameters<typeof renderTestingLibrary>[0]) =>
  renderTestingLibrary(<SnackbarProvider>{ui}</SnackbarProvider>);

describe("AdminInvitationForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates and displays a copyable invitation link", async () => {
    vi.mocked(createAdminInvitation).mockResolvedValueOnce({
      email: "new.admin@example.com",
      expiresAt: "2026-09-12T10:30:00.000Z",
      invitationUrl: "https://frontend.example/auth/google?invite=secret-token",
    });

    render(<AdminInvitationForm />);
    fireEvent.change(screen.getByLabelText("controlPanel.adminUsers.emailLabel"), {
      target: { value: "new.admin@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "controlPanel.adminUsers.create" }));

    await waitFor(() => {
      expect(createAdminInvitation).toHaveBeenCalledWith({ email: "new.admin@example.com" });
    });
    expect(
      screen.getByRole("heading", { name: "controlPanel.adminUsers.createdTitle" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("controlPanel.adminUsers.linkLabel")).toHaveValue(
      "https://frontend.example/auth/google?invite=secret-token",
    );
    expect(
      screen.getByRole("button", { name: "controlPanel.adminUsers.copyLink" }),
    ).toBeInTheDocument();
  });

  it("shows a safe message when the email is already enrolled", async () => {
    vi.mocked(createAdminInvitation).mockRejectedValueOnce(new ApiError(409, "conflict"));

    render(<AdminInvitationForm />);
    fireEvent.change(screen.getByLabelText("controlPanel.adminUsers.emailLabel"), {
      target: { value: "existing@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "controlPanel.adminUsers.create" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "controlPanel.adminUsers.errors.alreadyEnrolled",
      );
    });
  });
});
