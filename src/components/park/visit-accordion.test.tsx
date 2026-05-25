import type { Visit } from "@/lib/parks";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { VisitAccordion } from "./visit-accordion";

describe("VisitAccordion", () => {
  const visits: Visit[] = [
    {
      id: 1,
      visitedOn: "2024-01-15",
      route: "Talvireitti",
      author: null,
      note: null,
      createdAt: "2024-01-15T00:00:00Z",
      updatedAt: "2024-01-15T00:00:00Z",
      images: [],
    },
    {
      id: 2,
      visitedOn: "2024-03-20",
      route: "Nuuksion reitti",
      author: null,
      note: "Great hike",
      createdAt: "2024-03-20T00:00:00Z",
      updatedAt: "2024-03-20T00:00:00Z",
      images: [],
    },
    {
      id: 3,
      visitedOn: "2024-07-31",
      route: null,
      author: "Maija Meikäläinen",
      note: "Summer trip",
      createdAt: "2024-07-31T00:00:00Z",
      updatedAt: "2024-07-31T00:00:00Z",
      images: [],
    },
    {
      id: 4,
      visitedOn: "2024-08-15",
      route: "Pallas-reitti",
      author: "Pekka Puistossa",
      note: null,
      createdAt: "2024-08-15T00:00:00Z",
      updatedAt: "2024-08-16T00:00:00Z",
      images: [
        {
          id: 10,
          fullUrl: "https://example.com/full.jpg",
          thumbUrl: "https://example.com/thumb.jpg",
          fullWidth: 1920,
          fullHeight: 1080,
          thumbWidth: 400,
          thumbHeight: 225,
          originalName: "pallas.jpg",
          displayOrder: 0,
          createdAt: "2024-08-15T00:00:00Z",
        },
      ],
    },
    {
      id: 5,
      visitedOn: "2024-09-01",
      route: null,
      author: "Vain kirjoittaja",
      note: null,
      createdAt: "2024-09-01T08:00:00Z",
      updatedAt: "2024-09-01T18:00:00Z",
      images: [],
    },
  ];

  const getVisitToggle = (dateLabel: string) => {
    const button = screen.getByText(dateLabel).closest("button");

    if (!(button instanceof HTMLButtonElement)) {
      throw new Error(`No toggle button found for ${dateLabel}`);
    }

    return button;
  };

  const getVisitCard = (dateLabel: string) => {
    const card = screen.getByText(dateLabel).closest(".rounded-lg");

    if (!(card instanceof HTMLDivElement)) {
      throw new Error(`No visit card found for ${dateLabel}`);
    }

    return card;
  };

  it("renders visits sorted newest first with correct numbering", () => {
    render(<VisitAccordion visits={visits} />);

    // Visit numbers are shown as translated badges via park.visitNumber
    const badges = screen.getAllByText(/park\.visitNumber/);
    expect(badges.length).toBe(5);
  });

  it("shows expandable items for visits with notes, images or authors", () => {
    render(<VisitAccordion visits={visits} />);

    const toggleButtons = screen.getAllByRole("button", {
      name: /park\.(showDetails|hideDetails)/i,
    });
    expect(toggleButtons.length).toBe(4);
  });

  it("opens the newest expandable visit by default", () => {
    render(<VisitAccordion visits={visits} />);

    expect(getVisitToggle("1.9.2024")).toHaveAttribute("aria-expanded", "true");
    expect(getVisitToggle("15.8.2024")).toHaveAttribute("aria-expanded", "false");
  });

  it("lets the user switch between detailed visits and collapse the active one", async () => {
    const user = userEvent.setup();

    render(<VisitAccordion visits={visits} />);

    const newestVisit = getVisitToggle("1.9.2024");
    const imageVisit = getVisitToggle("15.8.2024");

    await user.click(imageVisit);

    expect(newestVisit).toHaveAttribute("aria-expanded", "false");
    expect(imageVisit).toHaveAttribute("aria-expanded", "true");

    await user.click(imageVisit);

    expect(imageVisit).toHaveAttribute("aria-expanded", "false");
  });

  it("shows non-expandable items when a visit has no expandable content", () => {
    render(<VisitAccordion visits={visits} />);

    expect(screen.getByText("15.1.2024")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /15\.1\.2024/ })).not.toBeInTheDocument();
  });

  it("keeps plain visits non-interactive even when clicked by surrounding controls", async () => {
    const user = userEvent.setup();

    render(<VisitAccordion visits={visits} />);

    const plainVisitCard = getVisitCard("15.1.2024");

    await user.click(plainVisitCard);

    expect(screen.getAllByRole("button", { name: "park.showDetails" })).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "park.hideDetails" })).toHaveLength(1);
  });

  it("displays route badge when present", () => {
    render(<VisitAccordion visits={visits} />);

    expect(screen.getByText("Pallas-reitti")).toBeInTheDocument();
    expect(screen.getByText("Nuuksion reitti")).toBeInTheDocument();
  });

  it("displays author details with Finnish creation and update dates", () => {
    render(<VisitAccordion visits={visits} />);

    const updatedAuthorVisit = getVisitCard("15.8.2024");
    const sameDayAuthorVisit = getVisitCard("1.9.2024");

    expect(
      within(updatedAuthorVisit).getByText(/Pekka Puistossa, 15\.8\.2024/),
    ).toBeInTheDocument();
    expect(
      within(updatedAuthorVisit).getByText(/park\.updatedAtLabel 16\.8\.2024/),
    ).toBeInTheDocument();
    expect(
      within(sameDayAuthorVisit).getByText(/Vain kirjoittaja, 1\.9\.2024/),
    ).toBeInTheDocument();
    expect(within(sameDayAuthorVisit).queryByText(/park\.updatedAtLabel/)).not.toBeInTheDocument();
    expect(screen.getAllByText("park.authorTitle").length).toBeGreaterThanOrEqual(1);
  });

  it("displays an image section when visit images exist", () => {
    render(<VisitAccordion visits={visits} />);

    expect(screen.getByText("park.imagesTitle")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "imageGallery.open" })).toBeInTheDocument();
  });

  it("shows edit links when editable", () => {
    render(<VisitAccordion visits={visits} isEditable />);

    expect(screen.getAllByLabelText("controlPanel.visits.edit").length).toBe(5);
  });

  it("does not toggle an expanded visit when the edit link is clicked", async () => {
    const user = userEvent.setup();

    render(<VisitAccordion visits={visits} isEditable />);

    const imageVisit = getVisitToggle("15.8.2024");

    await user.click(imageVisit);
    expect(imageVisit).toHaveAttribute("aria-expanded", "true");

    const editLink = within(imageVisit).getByRole("link", { name: "controlPanel.visits.edit" });
    editLink.addEventListener("click", (event) => event.preventDefault());

    await user.click(editLink);

    expect(imageVisit).toHaveAttribute("aria-expanded", "true");
  });

  it("does not show edit links when not editable", () => {
    render(<VisitAccordion visits={visits} />);

    expect(screen.queryByLabelText("controlPanel.visits.edit")).not.toBeInTheDocument();
  });

  it("applies the seasonal accent border for each visit month", () => {
    render(<VisitAccordion visits={visits} />);

    expect(getVisitCard("15.1.2024")).toHaveClass("border-l-sky-600", "dark:border-l-cyan-400");
    expect(getVisitCard("20.3.2024")).toHaveClass(
      "border-l-emerald-600",
      "dark:border-l-emerald-400",
    );
    expect(getVisitCard("31.7.2024")).toHaveClass("border-l-amber-500", "dark:border-l-amber-300");
    expect(getVisitCard("1.9.2024")).toHaveClass("border-l-orange-600", "dark:border-l-orange-400");
  });

  it("shows a season emoji before the visit number badge in each header", () => {
    render(<VisitAccordion visits={visits} />);

    expect(getVisitCard("15.1.2024")).toHaveTextContent("❄️");
    expect(getVisitCard("20.3.2024")).toHaveTextContent("🌱");
    expect(getVisitCard("31.7.2024")).toHaveTextContent("☀️");
    expect(getVisitCard("1.9.2024")).toHaveTextContent("🍂");
  });
});
