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
          lengthKm: null,
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

it("shows a trail length with an accessible label", () => {
  render(
    <I18nProvider>
      <HomeParkMemoryCard
        imageSizes={undefined}
        park={{
          name: "Polku",
          slug: "polku",
          visitCount: 2,
          areaKm2: null,
          lengthKm: 2.4,
          establishmentYear: null,
          type: { code: 4404, id: 4404, name: "Luontopolku", slug: "nature-trail" },
          descriptionExcerpt: null,
          featuredImage: null,
        }}
      />
    </I18nProvider>,
  );
  expect(screen.getByText("2,4 km")).toBeVisible();
  expect(screen.getByTitle("Pituus")).toHaveTextContent("Pituus");
});
