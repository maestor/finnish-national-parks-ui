import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MarkdownContent } from "./markdown-content";
import { MarkdownEditor } from "./markdown-editor";

describe("Markdown descriptions", () => {
  it("keeps ordinary line breaks, uses section headings, and rejects unsafe HTML and URLs", () => {
    const { container } = render(
      <MarkdownContent>
        {
          "# Otsikko\n\n## Alaotsikko\n\nEnsimmäinen rivi\nToinen rivi\n\n[Turvaton](javascript:alert%281%29)\n\n<script>alert(1)</script>"
        }
      </MarkdownContent>,
    );
    expect(screen.getByRole("heading", { name: "Otsikko", level: 3 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Alaotsikko", level: 3 })).toBeInTheDocument();
    const paragraph = screen.getByText(/Ensimmäinen rivi/);
    expect(paragraph.textContent).toBe("Ensimmäinen rivi\nToinen rivi");
    expect(paragraph).toHaveClass("whitespace-pre-line");
    expect(screen.getByText("Turvaton")).not.toHaveAttribute(
      "href",
      expect.stringContaining("javascript:"),
    );
    expect(container.querySelector("script")).toBeNull();
  });

  it("shows an accessible empty preview and preserves editor guidance when returning", async () => {
    const user = userEvent.setup();
    render(
      <MarkdownEditor
        id="description"
        label="Kuvaus"
        description="Julkinen kuvaus"
        value=""
        onValueChange={() => {}}
        placeholder="Kuvaus"
        inputClassName=""
      />,
    );
    expect(screen.getByRole("textbox", { name: "Kuvaus" })).toHaveAccessibleDescription(
      "Julkinen kuvaus 0 / 5000",
    );
    expect(screen.getByRole("link", { name: /markdownEditor.guide/ })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    await user.click(screen.getByRole("button", { name: "markdownEditor.preview" }));
    expect(screen.getByRole("region", { name: "Kuvaus" })).toHaveTextContent(
      "markdownEditor.emptyPreview",
    );
    expect(screen.getByRole("button", { name: "markdownEditor.edit" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "markdownEditor.edit" }));
    expect(screen.getByRole("textbox", { name: "Kuvaus" })).toHaveValue("");
  });
});
