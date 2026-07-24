import { act, fireEvent, render, screen } from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TripPlannerResolvedLocation, TripPlannerSuggestion } from "@/lib/trip-planner";
import { LocationSuggestionInput } from "./location-suggestion-input";

const mockFetchTripPlannerSuggestions = vi.fn();

vi.mock("@/lib/trip-planner", () => ({
  fetchTripPlannerSuggestions: (...args: unknown[]) => mockFetchTripPlannerSuggestions(...args),
}));

const createSuggestion = (
  label: string,
  coordinate = { lat: 60.1699, lon: 24.9384 },
): TripPlannerSuggestion => ({
  coordinate,
  displayName: label,
  label,
});

interface TestHarnessProps {
  assistiveMessage?: string;
  assistiveMessageTone?: "default" | "error";
  initialSelectedLocation?: TripPlannerResolvedLocation | null;
  initialValue?: string;
  isLocating?: boolean;
  locateButtonLabel?: string;
  onLocate?: () => void;
  onSelectedLocationChange?: (location: TripPlannerResolvedLocation | null) => void;
  onValueChange?: (value: string) => void;
  required?: boolean;
}

const TestHarness = ({
  assistiveMessage,
  assistiveMessageTone,
  initialSelectedLocation = null,
  initialValue = "",
  isLocating = false,
  locateButtonLabel = "Kayta nykyista sijaintia",
  onLocate,
  onSelectedLocationChange,
  onValueChange,
  required = false,
}: TestHarnessProps) => {
  const [value, setValue] = useState(initialValue);
  const [selectedLocation, setSelectedLocation] = useState<TripPlannerResolvedLocation | null>(
    initialSelectedLocation,
  );

  return (
    <LocationSuggestionInput
      assistiveMessage={assistiveMessage}
      assistiveMessageTone={assistiveMessageTone}
      errorMessage="Valitse sijainti"
      id="location"
      isLocating={isLocating}
      label={"Sijainti" satisfies ReactNode}
      locateButtonLabel={locateButtonLabel}
      name="location"
      onLocate={onLocate}
      onSelectedLocationChange={(location) => {
        setSelectedLocation(location);
        onSelectedLocationChange?.(location);
      }}
      onValueChange={(nextValue) => {
        setValue(nextValue);
        onValueChange?.(nextValue);
      }}
      placeholder="Hae sijaintia"
      required={required}
      selectedLocation={selectedLocation}
      value={value}
    />
  );
};

describe("LocationSuggestionInput", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFetchTripPlannerSuggestions.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fetches suggestions after a debounce and applies a clicked suggestion", async () => {
    const handleSelectedLocationChange = vi.fn();
    const handleValueChange = vi.fn();

    mockFetchTripPlannerSuggestions.mockResolvedValue({
      suggestions: [
        createSuggestion("Helsinki, Suomi"),
        createSuggestion("Helsinki keskusta", { lat: 60.171, lon: 24.941 }),
      ],
    });

    render(
      <TestHarness
        onSelectedLocationChange={handleSelectedLocationChange}
        onValueChange={handleValueChange}
      />,
    );

    const input = screen.getByRole("combobox", { name: "Sijainti" });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Helsinki" } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
      await Promise.resolve();
    });

    expect(mockFetchTripPlannerSuggestions).toHaveBeenCalledWith(
      { query: "Helsinki" },
      expect.any(AbortSignal),
    );

    fireEvent.click(screen.getByRole("option", { name: "Helsinki, Suomi" }));

    expect(input).toHaveValue("Helsinki, Suomi");
    expect(handleValueChange).toHaveBeenCalledWith("Helsinki, Suomi");
    expect(handleSelectedLocationChange).toHaveBeenLastCalledWith({
      coordinate: { lat: 60.1699, lon: 24.9384 },
      displayName: "Helsinki, Suomi",
      label: "Helsinki, Suomi",
    });
    expect(screen.queryByRole("option", { name: "Helsinki keskusta" })).not.toBeInTheDocument();
  });

  it("supports keyboard navigation and enter selection", async () => {
    const handleSelectedLocationChange = vi.fn();

    mockFetchTripPlannerSuggestions.mockResolvedValue({
      suggestions: [
        createSuggestion("Tampere, Suomi"),
        createSuggestion("Tampere keskusta", { lat: 61.498, lon: 23.761 }),
      ],
    });

    render(<TestHarness onSelectedLocationChange={handleSelectedLocationChange} />);

    const input = screen.getByRole("combobox", { name: "Sijainti" });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Tampere" } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
      await Promise.resolve();
    });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(input).toHaveValue("Tampere keskusta");
    expect(handleSelectedLocationChange).toHaveBeenLastCalledWith({
      coordinate: { lat: 61.498, lon: 23.761 },
      displayName: "Tampere keskusta",
      label: "Tampere keskusta",
    });
  });

  it("reuses cached suggestions on refocus without fetching again", async () => {
    mockFetchTripPlannerSuggestions.mockResolvedValue({
      suggestions: [createSuggestion("Turku, Suomi")],
    });

    render(<TestHarness />);

    const input = screen.getByRole("combobox", { name: "Sijainti" });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Turku" } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
      await Promise.resolve();
    });

    expect(screen.getByRole("option", { name: "Turku, Suomi" })).toBeInTheDocument();

    fireEvent.blur(input);
    fireEvent.focus(input);

    expect(screen.getByRole("option", { name: "Turku, Suomi" })).toBeInTheDocument();
    expect(mockFetchTripPlannerSuggestions).toHaveBeenCalledTimes(1);
  });

  it("does not fetch when the current value already matches the selected location", async () => {
    const selectedLocation = createSuggestion("Porvoo, Suomi", { lat: 60.3923, lon: 25.6651 });

    render(<TestHarness initialSelectedLocation={selectedLocation} initialValue="Porvoo, Suomi" />);

    const input = screen.getByRole("combobox", { name: "Sijainti" });

    fireEvent.focus(input);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
      await Promise.resolve();
    });

    expect(mockFetchTripPlannerSuggestions).not.toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("clears the selected location when the typed value no longer matches it", async () => {
    const handleSelectedLocationChange = vi.fn();
    const initialLocation = createSuggestion("Oulu, Suomi", { lat: 65.0121, lon: 25.4651 });

    render(
      <TestHarness
        initialSelectedLocation={initialLocation}
        initialValue={initialLocation.label}
        onSelectedLocationChange={handleSelectedLocationChange}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Sijainti" }), {
      target: { value: "Oulu keskusta" },
    });

    expect(handleSelectedLocationChange).toHaveBeenCalledWith(null);
  });

  it("shows the required error on blur and renders assistive messaging", async () => {
    render(
      <TestHarness assistiveMessage="Sijaintia haetaan" assistiveMessageTone="error" required />,
    );

    const input = screen.getByRole("combobox", { name: "Sijainti" });

    fireEvent.focus(input);
    fireEvent.blur(input);

    expect(screen.getByText("Valitse sijainti")).toBeInTheDocument();
    expect(screen.getByText("Sijaintia haetaan")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("closes an open list when the query becomes shorter than the minimum length", async () => {
    mockFetchTripPlannerSuggestions.mockResolvedValue({
      suggestions: [createSuggestion("Kuopio, Suomi")],
    });

    render(<TestHarness />);

    const input = screen.getByRole("combobox", { name: "Sijainti" });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Kuopio" } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
      await Promise.resolve();
    });

    expect(screen.getByRole("option", { name: "Kuopio, Suomi" })).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "K" } });

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("invokes the locate action and disables the button while locating", () => {
    const handleLocate = vi.fn();
    const { rerender } = render(<TestHarness onLocate={handleLocate} />);

    const locateButton = screen.getByRole("button", { name: "Kayta nykyista sijaintia" });
    fireEvent.click(locateButton);

    expect(handleLocate).toHaveBeenCalledTimes(1);

    rerender(<TestHarness isLocating onLocate={handleLocate} />);

    expect(screen.getByRole("button", { name: "Kayta nykyista sijaintia" })).toBeDisabled();
  });

  it("wraps keyboard navigation upward and selects with enter", async () => {
    const handleSelectedLocationChange = vi.fn();

    mockFetchTripPlannerSuggestions.mockResolvedValue({
      suggestions: [
        createSuggestion("Vaasa, Suomi"),
        createSuggestion("Vaasa keskusta", { lat: 63.0951, lon: 21.6165 }),
      ],
    });

    render(<TestHarness onSelectedLocationChange={handleSelectedLocationChange} />);

    const input = screen.getByRole("combobox", { name: "Sijainti" });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Vaasa" } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
      await Promise.resolve();
    });

    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(input).toHaveValue("Vaasa keskusta");
    expect(handleSelectedLocationChange).toHaveBeenLastCalledWith({
      coordinate: { lat: 63.0951, lon: 21.6165 },
      displayName: "Vaasa keskusta",
      label: "Vaasa keskusta",
    });
  });

  it("closes the suggestion list on escape and on failed fetch", async () => {
    mockFetchTripPlannerSuggestions.mockRejectedValue(new Error("search failed"));

    render(<TestHarness />);

    const input = screen.getByRole("combobox", { name: "Sijainti" });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Lahti" } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
      await Promise.resolve();
    });

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    mockFetchTripPlannerSuggestions.mockResolvedValue({
      suggestions: [createSuggestion("Lahtis, Suomi")],
    });

    fireEvent.change(input, { target: { value: "Lahtis" } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
      await Promise.resolve();
    });

    expect(screen.getByRole("option", { name: "Lahtis, Suomi" })).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
