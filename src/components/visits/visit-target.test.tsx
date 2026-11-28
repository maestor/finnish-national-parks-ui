import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { VisitTarget } from "./visit-target";

const areas = [
  { id: 1, name: "Aulanko", slug: "aulanko" },
  { id: 2, name: "Langinkoski", slug: "langinkoski" },
];

it("puts free text first and keeps every linked area visible", () => {
  render(<VisitTarget visit={{ route: "  Oma kohde  ", areas }} label="Kohde" />);
  const primary = screen.getByText("Oma kohde");
  const group = primary.parentElement;
  if (!group) throw new Error("Missing target group");
  expect(screen.getByText("Kohde").nextElementSibling).toBe(primary);
  expect(within(group).getByText("Aulanko")).toBeVisible();
  expect(within(group).getByText("Langinkoski")).toBeVisible();
});

it("shows the linked names as the main target for blank text and omits an empty target", () => {
  const { rerender, container } = render(<VisitTarget visit={{ route: " ", areas }} />);
  expect(
    screen.getByText("Aulanko").parentElement?.parentElement?.firstElementChild,
  ).toContainElement(screen.getByText("Langinkoski"));
  rerender(<VisitTarget visit={{ route: " " }} label="Kohde" />);
  expect(container).toBeEmptyDOMElement();
});
