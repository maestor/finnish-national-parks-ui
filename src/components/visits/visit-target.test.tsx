import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { VisitTarget, VisitTargetBadges } from "./visit-target";

const areas = [
  { id: 1, name: "Aulanko", slug: "aulanko" },
  { id: 2, name: "Langinkoski", slug: "langinkoski" },
];

it("uses only free text when a visit also has linked areas", () => {
  render(<VisitTarget visit={{ route: "  Oma kohde  ", areas }} label="Kohde" />);
  const primary = screen.getByText("Oma kohde");
  expect(screen.getByText("Kohde").nextElementSibling).toBe(primary);
  expect(screen.queryByText("Aulanko")).not.toBeInTheDocument();
  expect(screen.queryByText("Langinkoski")).not.toBeInTheDocument();
});

it("shows the linked names as the main target for blank text and omits an empty target", () => {
  const { rerender, container } = render(<VisitTarget visit={{ route: " ", areas }} />);
  expect(screen.getByText("Aulanko, Langinkoski")).toBeVisible();
  rerender(<VisitTarget visit={{ route: " " }} label="Kohde" />);
  expect(container).toBeEmptyDOMElement();
});

it("renders one badge per linked area only when the free-text target is blank", () => {
  const badgeProps = {
    icon: <span aria-hidden="true">•</span>,
    className: "badge",
    renderArea: ({ name, slug }: (typeof areas)[number]) => <a href={slug}>{name}</a>,
  };
  const { rerender } = render(
    <VisitTargetBadges {...badgeProps} visit={{ route: "  Oma kohde  ", areas }} />,
  );
  expect(screen.getByText("Oma kohde")).toBeVisible();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();

  rerender(<VisitTargetBadges {...badgeProps} visit={{ route: " ", areas }} />);
  const aulanko = screen.getByRole("link", { name: "Aulanko" });
  const langinkoski = screen.getByRole("link", { name: "Langinkoski" });
  expect(aulanko.closest(".badge")).not.toBe(langinkoski.closest(".badge"));
  expect(aulanko).toHaveAttribute("href", "aulanko");
  expect(langinkoski).toHaveAttribute("href", "langinkoski");

  rerender(
    <VisitTargetBadges {...badgeProps} renderArea={undefined} visit={{ route: null, areas }} />,
  );
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(screen.getByText("Aulanko")).toBeVisible();
  expect(screen.getByText("Langinkoski")).toBeVisible();
});
