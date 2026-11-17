import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { expect, it, vi } from "vitest";
import messages from "../../../messages/fi.json";
import { ReviewStoryTrails } from "./review-story-shared";

vi.unmock("next-intl");

it("uses Finnish singular and plural trail labels and omits unassigned or legacy trails", () => {
  const renderTrails = (trails?: { name: string }[]) => (
    <NextIntlClientProvider locale="fi" messages={messages}>
      <ReviewStoryTrails trails={trails} />
    </NextIntlClientProvider>
  );
  const { rerender, container } = render(renderTrails([{ name: "Metsäpolku" }]));
  expect(screen.getByText("Reitti:").parentElement).toHaveTextContent("Reitti: Metsäpolku");
  rerender(renderTrails([{ name: "Metsäpolku" }, { name: "Rantapolku" }]));
  expect(screen.getByText("Reitit:").parentElement).toHaveTextContent(
    "Reitit: Metsäpolku, Rantapolku",
  );
  rerender(renderTrails([]));
  expect(container).toBeEmptyDOMElement();
  rerender(renderTrails());
  expect(container).toBeEmptyDOMElement();
});

it("renders trails as a labelled information tile for milestone visits", () => {
  render(
    <NextIntlClientProvider locale="fi" messages={messages}>
      <ReviewStoryTrails trails={[{ name: "Metsäpolku" }]} variant="tile" />
    </NextIntlClientProvider>,
  );
  expect(screen.getByText("Reitti")).toBeInTheDocument();
  expect(screen.getByText("Metsäpolku")).toBeInTheDocument();
});
