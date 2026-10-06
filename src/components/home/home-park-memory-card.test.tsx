import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { I18nProvider } from "@/test/i18n";
import { HomeParkMemoryCard } from "./home-park-memory-card";

vi.unmock("next-intl");

it("shows the visit count on the cover while retaining the park facts", () => {
  render(
    <I18nProvider>
      <HomeParkMemoryCard
        imageSizes={undefined}
        park={{
          name: "Nuuksio",
          slug: "nuuksio",
          visitCount: 9,
          areaKm2: 55,
          establishmentYear: 1994,
          type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" },
          descriptionExcerpt: "Tuttu metsä",
          featuredImage: null,
        }}
      />
    </I18nProvider>,
  );
  expect(screen.getByText("Kansallispuisto")).toBeVisible();
  expect(screen.getByText("9 käyntiä")).toBeVisible();
  expect(screen.getByText("9 käyntiä").closest(".aspect-video")).not.toBeNull();
  expect(screen.getByText("1994")).toBeVisible();
  expect(screen.getByText("55 km²")).toBeVisible();
});
