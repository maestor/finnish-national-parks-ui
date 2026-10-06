import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  StickySectionNavigation,
  type StickySectionNavigationItem,
} from "./sticky-section-navigation";

vi.mock("next/navigation", () => ({ usePathname: () => window.location.pathname }));

const items: StickySectionNavigationItem[] = [
  {
    id: "first-section",
    label: "First",
  },
  {
    id: "second-section",
    label: "Second",
  },
];

describe("StickySectionNavigation", () => {
  let frames: FrameRequestCallback[];

  beforeEach(() => {
    frames = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.history.replaceState(null, "", "/");
    document.documentElement.style.removeProperty("--page-sticky-nav-top");
  });

  const flushFrame = () => {
    act(() => {
      const pending = frames.splice(0);
      for (const callback of pending) callback(0);
    });
  };

  const measureSection = (section: HTMLElement) => {
    const rect = new DOMRect(0, 600, 200, 100);
    vi.spyOn(section, "getBoundingClientRect").mockReturnValue(rect);
    return vi
      .spyOn(section, "getClientRects")
      .mockReturnValue(Object.assign([rect], { item: () => rect }));
  };

  const measureNavigation = () => {
    Object.defineProperty(
      screen.getByRole("navigation", { name: "Page sections" }),
      "offsetHeight",
      {
        configurable: true,
        value: 40,
      },
    );
  };

  it("does not render a navigation when there is only one section", () => {
    const onHeightChange = vi.fn();

    render(
      <StickySectionNavigation
        ariaLabel="Page sections"
        items={[items[0]]}
        onHeightChange={onHeightChange}
      />,
    );

    expect(screen.queryByRole("navigation", { name: "Page sections" })).not.toBeInTheDocument();
    expect(onHeightChange).toHaveBeenCalledWith(0);
  });

  it("renders links even before matching section elements exist in the page", () => {
    render(<StickySectionNavigation ariaLabel="Page sections" items={items} />);

    const navigation = screen.getByRole("navigation", { name: "Page sections" });

    expect(navigation).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "First" })).toHaveAttribute("href", "#first-section");
    expect(screen.getByRole("link", { name: "Second" })).toHaveAttribute("href", "#second-section");
  });

  it.each([
    { margin: "112px", topOffset: "56px", expectedTop: 504 },
    { margin: "0px", topOffset: "56px", expectedTop: 504 },
    { margin: "40px", topOffset: "0px", expectedTop: 504 },
  ])(
    "restores a shared section below the sticky navigation with margin $margin",
    ({ margin, topOffset, expectedTop }) => {
      window.history.replaceState(null, "", "/#second-section");
      const historyLength = window.history.length;
      const view = render(
        <>
          <StickySectionNavigation ariaLabel="Page sections" items={items} topOffset={topOffset} />
          <section id="second-section" style={{ scrollMarginTop: margin }} />
        </>,
      );
      measureSection(view.container.querySelector("section") as HTMLElement);
      measureNavigation();
      flushFrame();

      expect(window.scrollTo).toHaveBeenCalledExactlyOnceWith({
        top: expectedTop,
        behavior: "instant",
      });
      expect(window.location.hash).toBe("#second-section");
      expect(window.history.length).toBe(historyLength);

      // Ordinary rerenders must not snap the visitor back after they scroll on.
      view.rerender(
        <>
          <StickySectionNavigation
            ariaLabel="Page sections"
            items={[...items]}
            topOffset={topOffset}
          />
          <section id="second-section" style={{ scrollMarginTop: margin }} />
        </>,
      );
      flushFrame();
      expect(window.scrollTo).toHaveBeenCalledTimes(1);
    },
  );

  it("restores a selected visit within its section while section clicks still target the heading", () => {
    window.history.replaceState(null, "", "/?visit=21#second-section");
    const view = render(
      <>
        <StickySectionNavigation
          ariaLabel="Page sections"
          items={[items[0], { ...items[1], initialTargetId: "selected-visit" }]}
          topOffset="56px"
        />
        <section id="second-section">
          <div id="selected-visit" />
        </section>
      </>,
    );
    const section = view.container.querySelector("section") as HTMLElement;
    measureSection(section);
    vi.mocked(section.getBoundingClientRect).mockReturnValue(new DOMRect(0, 100, 200, 1000));
    measureSection(view.container.querySelector("#selected-visit") as HTMLElement);
    measureNavigation();
    flushFrame();
    expect(window.scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 504, behavior: "instant" });
    const link = screen.getByRole("link", { name: "Second" });
    expect(link).toHaveAttribute("aria-current", "location");
    expect(link).toHaveAttribute("href", "#second-section");
    expect(window.location.search).toBe("?visit=21");
    expect(window.location.hash).toBe("#second-section");

    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: false })),
    );
    fireEvent.click(link);
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 60, behavior: "smooth" });
  });

  it("keeps a short section active until the next section reaches the sticky navigation", () => {
    const view = render(
      <>
        <StickySectionNavigation ariaLabel="Page sections" items={items} />
        <section id="first-section" />
        <section id="second-section" />
      </>,
    );
    vi.spyOn(
      screen.getByRole("navigation", { name: "Page sections" }),
      "getBoundingClientRect",
    ).mockReturnValue(new DOMRect(0, 56, 200, 40));
    const sections = view.container.querySelectorAll("section");
    vi.spyOn(sections[0], "getBoundingClientRect").mockReturnValue(new DOMRect(0, 96, 200, 100));
    const nextSectionRect = vi
      .spyOn(sections[1], "getBoundingClientRect")
      .mockReturnValue(new DOMRect(0, 220, 200, 1000));

    fireEvent.scroll(window);
    flushFrame();
    expect(screen.getByRole("link", { name: "First" })).toHaveAttribute("aria-current", "location");
    expect(screen.getByRole("link", { name: "Second" })).not.toHaveAttribute("aria-current");

    nextSectionRect.mockReturnValue(new DOMRect(0, 96, 200, 1000));
    fireEvent.scroll(window);
    flushFrame();
    expect(screen.getByRole("link", { name: "Second" })).toHaveAttribute(
      "aria-current",
      "location",
    );
  });

  it("selects the final visible section when the page ends before it can reach the navigation", () => {
    const view = render(
      <>
        <StickySectionNavigation ariaLabel="Page sections" items={items} />
        <section id="first-section" />
        <section id="second-section" />
      </>,
    );
    vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(2000);
    vi.spyOn(window, "scrollY", "get").mockReturnValue(2000 - window.innerHeight);
    vi.spyOn(
      screen.getByRole("navigation", { name: "Page sections" }),
      "getBoundingClientRect",
    ).mockReturnValue(new DOMRect(0, 56, 200, 40));
    const sections = view.container.querySelectorAll("section");
    vi.spyOn(sections[0], "getBoundingClientRect").mockReturnValue(new DOMRect(0, -100, 200, 300));
    vi.spyOn(sections[1], "getBoundingClientRect").mockReturnValue(new DOMRect(0, 220, 200, 100));

    fireEvent.scroll(window);
    flushFrame();
    expect(screen.getByRole("link", { name: "Second" })).toHaveAttribute(
      "aria-current",
      "location",
    );
  });

  it("updates the active link when the main header changes the navigation offset after scrolling", async () => {
    const view = render(
      <>
        <StickySectionNavigation ariaLabel="Page sections" items={items} />
        <section id="first-section" />
        <section id="second-section" />
      </>,
    );
    const navRect = vi
      .spyOn(screen.getByRole("navigation", { name: "Page sections" }), "getBoundingClientRect")
      .mockReturnValue(new DOMRect(0, 0, 200, 40));
    const sections = view.container.querySelectorAll("section");
    vi.spyOn(sections[0], "getBoundingClientRect").mockReturnValue(new DOMRect(0, -200, 200, 100));
    vi.spyOn(sections[1], "getBoundingClientRect").mockReturnValue(new DOMRect(0, 96, 200, 100));
    fireEvent.scroll(window);
    flushFrame();
    expect(screen.getByRole("link", { name: "First" })).toHaveAttribute("aria-current", "location");

    navRect.mockReturnValue(new DOMRect(0, 56, 200, 40));
    document.documentElement.style.setProperty("--page-sticky-nav-top", "3.5rem");
    await waitFor(() => expect(frames).toHaveLength(1));
    flushFrame();
    expect(screen.getByRole("link", { name: "Second" })).toHaveAttribute(
      "aria-current",
      "location",
    );
  });

  it("waits for a streamed section to arrive before restoring the initial hash", async () => {
    window.history.replaceState(null, "", "/#second-section");
    const view = render(
      <StickySectionNavigation ariaLabel="Page sections" items={items} topOffset="56px" />,
    );
    measureNavigation();
    flushFrame();
    expect(window.scrollTo).not.toHaveBeenCalled();

    const section = document.createElement("section");
    section.id = "second-section";
    measureSection(section);
    view.container.append(section);
    await waitFor(() => expect(frames).toHaveLength(1));
    flushFrame();
    expect(window.scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 504, behavior: "instant" });

    const firstSection = document.createElement("section");
    firstSection.id = "first-section";
    vi.spyOn(firstSection, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 200, 100));
    view.container.prepend(firstSection);
    fireEvent.scroll(window);
    flushFrame();
    expect(screen.getByRole("link", { name: "First" })).toHaveAttribute("aria-current", "location");
  });

  it("restores the new route's fragment when the navigation component is reused", () => {
    window.history.replaceState(null, "", "/#second-section");
    const content = (
      <>
        <StickySectionNavigation ariaLabel="Page sections" items={items} topOffset="56px" />
        <section id="first-section" />
        <section id="second-section" />
      </>
    );
    const view = render(content);
    for (const section of view.container.querySelectorAll("section")) measureSection(section);
    measureNavigation();
    flushFrame();

    window.history.replaceState(null, "", "/next#first-section");
    view.rerender(
      <>
        <StickySectionNavigation ariaLabel="Page sections" items={items} topOffset="56px" />
        <section id="first-section" />
        <section id="second-section" />
      </>,
    );
    flushFrame();
    expect(window.scrollTo).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("link", { name: "First" })).toHaveAttribute("aria-current", "location");
  });

  it("restores after document load so the browser's native fragment scroll finishes first", () => {
    window.history.replaceState(null, "", "/#second-section");
    const readyState = vi.spyOn(document, "readyState", "get").mockReturnValue("interactive");
    const view = render(
      <>
        <StickySectionNavigation ariaLabel="Page sections" items={items} topOffset="56px" />
        <section id="second-section" />
      </>,
    );
    measureSection(view.container.querySelector("section") as HTMLElement);
    measureNavigation();
    flushFrame();
    expect(window.scrollTo).not.toHaveBeenCalled();

    readyState.mockReturnValue("complete");
    fireEvent.load(window);
    flushFrame();
    expect(window.scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 504, behavior: "instant" });
  });

  it("waits until the streamed section is revealed", async () => {
    window.history.replaceState(null, "", "/#second-section");
    const view = render(
      <>
        <StickySectionNavigation ariaLabel="Page sections" items={items} topOffset="56px" />
        <section id="second-section" hidden />
      </>,
    );
    const section = view.container.querySelector("section") as HTMLElement;
    const rects = measureSection(section);
    rects.mockReturnValue(Object.assign([], { item: () => null }));
    measureNavigation();
    flushFrame();
    expect(window.scrollTo).not.toHaveBeenCalled();

    const rect = new DOMRect(0, 600, 200, 100);
    rects.mockReturnValue(Object.assign([rect], { item: () => rect }));
    section.hidden = false;
    await waitFor(() => expect(frames).toHaveLength(1));
    flushFrame();
    expect(window.scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 504, behavior: "instant" });
  });

  it.each(["", "#unrelated-section"])(
    "leaves the initial URL %s to ordinary browser navigation",
    (hash) => {
      window.history.replaceState(null, "", `/${hash}`);
      const view = render(<StickySectionNavigation ariaLabel="Page sections" items={items} />);
      flushFrame();
      expect(window.scrollTo).not.toHaveBeenCalled();

      window.history.pushState(null, "", "#second-section");
      view.rerender(<StickySectionNavigation ariaLabel="Page sections" items={[...items]} />);
      flushFrame();
      expect(window.scrollTo).not.toHaveBeenCalled();
    },
  );

  it("does not override a fragment the visitor changed before restoration", () => {
    window.history.replaceState(null, "", "/#second-section");
    render(<StickySectionNavigation ariaLabel="Page sections" items={items} />);
    window.history.replaceState(null, "", "#first-section");
    flushFrame();
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("cancels pending restoration when the navigation unmounts", async () => {
    window.history.replaceState(null, "", "/#second-section");
    const view = render(<StickySectionNavigation ariaLabel="Page sections" items={items} />);
    view.unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
    frames = [];
    view.container.append(document.createElement("section"));
    await Promise.resolve();
    expect(frames).toHaveLength(0);
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
