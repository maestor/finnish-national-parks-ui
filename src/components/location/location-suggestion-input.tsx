"use client";

import { LoaderCircle, LocateFixed } from "lucide-react";
import {
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";
import {
  fetchTripPlannerSuggestions,
  type TripPlannerResolvedLocation,
  type TripPlannerSuggestion,
} from "@/lib/trip-planner";

const INPUT_CLASS_NAME =
  "flex h-11 w-full rounded-xl border border-white/45 bg-white/78 px-3 py-2 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";
const MIN_SUGGESTION_QUERY_LENGTH = 2;
const SUGGESTION_DEBOUNCE_MS = 250;
const SUGGESTION_LIST_CLASS_NAME =
  "absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-[1.35rem] border border-white/55 bg-white/96 shadow-[0_20px_40px_rgba(148,163,184,0.24)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/94 dark:shadow-[0_24px_48px_rgba(2,6,23,0.42)]";
const SUGGESTION_OPTION_CLASS_NAME =
  "cursor-pointer px-3 py-2 text-sm text-foreground transition-colors hover:bg-white/82 dark:hover:bg-slate-900/82";

const normalizeSuggestionQuery = (query: string) => query.trim().replaceAll(/\s+/g, " ");

const getSuggestionQueryKey = (query: string) =>
  normalizeSuggestionQuery(query).toLocaleLowerCase("fi-FI");

const getTripPlannerSuggestionKey = ({ coordinate, label }: TripPlannerSuggestion) =>
  `${label}-${coordinate.lat.toFixed(6)},${coordinate.lon.toFixed(6)}`;

interface LocationSuggestionInputProps {
  assistiveMessage?: string;
  assistiveMessageTone?: "default" | "error";
  errorMessage?: string;
  id: string;
  inputClassName?: string;
  isLocating?: boolean;
  label: ReactNode;
  locateButtonLabel?: string;
  name: string;
  onLocate?: () => void;
  onSelectedLocationChange: (location: TripPlannerResolvedLocation | null) => void;
  onValueChange: (value: string) => void;
  placeholder: string;
  required: boolean;
  selectedLocation: TripPlannerResolvedLocation | null;
  value: string;
}

export const LocationSuggestionInput = ({
  assistiveMessage,
  assistiveMessageTone = "default",
  errorMessage,
  id,
  inputClassName,
  isLocating = false,
  label,
  locateButtonLabel,
  name,
  onLocate,
  onSelectedLocationChange,
  onValueChange,
  placeholder,
  required,
  selectedLocation,
  value,
}: LocationSuggestionInputProps) => {
  const errorId = useId();
  const assistiveMessageId = useId();
  const listboxId = useId();
  const isFocusedRef = useRef(false);
  const debounceTimeoutRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const latestRequestIdRef = useRef(0);
  const suggestionCacheRef = useRef(new Map<string, TripPlannerSuggestion[]>());
  const [hasBeenTouched, setHasBeenTouched] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<TripPlannerSuggestion[]>([]);

  const normalizedValue = normalizeSuggestionQuery(value);
  const queryKey = getSuggestionQueryKey(value);
  const selectedLocationKey = selectedLocation
    ? getSuggestionQueryKey(selectedLocation.label)
    : null;
  const hasSuggestionQuery = normalizedValue.length >= MIN_SUGGESTION_QUERY_LENGTH;
  const activeSuggestionId =
    highlightedIndex >= 0
      ? `${listboxId}-option-${getTripPlannerSuggestionKey(suggestions[highlightedIndex])}`
      : undefined;
  const showRequiredError = required && hasBeenTouched && normalizedValue.length === 0;
  const describedBy = [
    showRequiredError ? errorId : null,
    assistiveMessage ? assistiveMessageId : null,
  ]
    .filter((currentId) => currentId !== null)
    .join(" ");

  useEffect(() => {
    if (debounceTimeoutRef.current !== null) {
      window.clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    if (!hasSuggestionQuery || selectedLocationKey === queryKey) {
      setSuggestions([]);
      setHighlightedIndex(-1);
      setIsOpen(false);
      return;
    }

    const cachedSuggestions = suggestionCacheRef.current.get(queryKey);
    if (cachedSuggestions) {
      setSuggestions(cachedSuggestions);
      setHighlightedIndex(-1);

      if (isFocusedRef.current && cachedSuggestions.length > 0) {
        setIsOpen(true);
      }

      return;
    }

    debounceTimeoutRef.current = window.setTimeout(async () => {
      const controller = new AbortController();
      const requestId = latestRequestIdRef.current + 1;
      latestRequestIdRef.current = requestId;
      abortControllerRef.current = controller;

      try {
        const response = await fetchTripPlannerSuggestions(
          { query: normalizedValue },
          controller.signal,
        );

        if (latestRequestIdRef.current !== requestId) {
          return;
        }

        suggestionCacheRef.current.set(queryKey, response.suggestions);
        setSuggestions(response.suggestions);
        setHighlightedIndex(-1);
        setIsOpen(isFocusedRef.current && response.suggestions.length > 0);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        if (latestRequestIdRef.current !== requestId) {
          return;
        }

        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setSuggestions([]);
        setHighlightedIndex(-1);
        setIsOpen(false);
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    }, SUGGESTION_DEBOUNCE_MS);

    return () => {
      if (debounceTimeoutRef.current !== null) {
        window.clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }

      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, [hasSuggestionQuery, normalizedValue, queryKey, selectedLocationKey]);

  const closeSuggestions = () => {
    setHighlightedIndex(-1);
    setIsOpen(false);
  };

  const applySuggestion = (suggestion: TripPlannerSuggestion) => {
    suggestionCacheRef.current.set(getSuggestionQueryKey(suggestion.label), [suggestion]);
    setHasBeenTouched(true);
    onValueChange(suggestion.label);
    onSelectedLocationChange(suggestion);
    setSuggestions([]);
    closeSuggestions();
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    const nextQueryKey = getSuggestionQueryKey(nextValue);
    const nextNormalizedValue = normalizeSuggestionQuery(nextValue);

    setHasBeenTouched(true);
    onValueChange(nextValue);

    if (selectedLocationKey !== nextQueryKey) {
      onSelectedLocationChange(null);
    }

    setHighlightedIndex(-1);

    if (nextNormalizedValue.length < MIN_SUGGESTION_QUERY_LENGTH) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const cachedSuggestions = suggestionCacheRef.current.get(nextQueryKey) ?? [];
    setSuggestions(cachedSuggestions);
    setIsOpen(cachedSuggestions.length > 0);
  };

  const handleFocus = () => {
    isFocusedRef.current = true;

    if (!hasSuggestionQuery || selectedLocationKey === queryKey) {
      return;
    }

    const cachedSuggestions = suggestionCacheRef.current.get(queryKey);
    if (cachedSuggestions && cachedSuggestions.length > 0) {
      setSuggestions(cachedSuggestions);
      setIsOpen(true);
    }
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    setHasBeenTouched(true);
    closeSuggestions();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      closeSuggestions();
      return;
    }

    if (suggestions.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((current) => (current + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
      return;
    }

    if (event.key === "Enter" && isOpen && highlightedIndex >= 0) {
      event.preventDefault();
      applySuggestion(suggestions[highlightedIndex]);
    }
  };

  return (
    <div className="relative space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <input
          id={id}
          name={name}
          className={cn(
            INPUT_CLASS_NAME,
            onLocate ? "pr-14" : null,
            inputClassName,
            showRequiredError &&
              "border-destructive/70 focus-visible:border-destructive focus-visible:ring-destructive/40",
          )}
          autoComplete="off"
          value={value}
          onBlur={handleBlur}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-describedby={describedBy || undefined}
          aria-invalid={showRequiredError || undefined}
          aria-required={required}
          required={required}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={isOpen ? listboxId : undefined}
          aria-activedescendant={isOpen ? activeSuggestionId : undefined}
          aria-expanded={isOpen}
        />

        {onLocate && locateButtonLabel ? (
          <button
            type="button"
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/72 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60 dark:hover:bg-slate-900/72"
            aria-label={locateButtonLabel}
            title={locateButtonLabel}
            onClick={onLocate}
            disabled={isLocating}
          >
            {isLocating ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <LocateFixed className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>

      {showRequiredError && errorMessage ? (
        <p id={errorId} className="text-sm text-destructive" aria-live="polite">
          {errorMessage}
        </p>
      ) : null}

      {assistiveMessage ? (
        <p
          id={assistiveMessageId}
          className={cn(
            "text-sm",
            assistiveMessageTone === "error" ? "text-destructive" : "text-muted-foreground",
          )}
          aria-live="polite"
        >
          {assistiveMessage}
        </p>
      ) : null}

      {isOpen ? (
        <div id={listboxId} role="listbox" tabIndex={-1} className={SUGGESTION_LIST_CLASS_NAME}>
          {suggestions.map((suggestion, index) => (
            <div
              key={getTripPlannerSuggestionKey(suggestion)}
              id={`${listboxId}-option-${getTripPlannerSuggestionKey(suggestion)}`}
              role="option"
              tabIndex={-1}
              aria-selected={highlightedIndex === index}
              className={cn(
                SUGGESTION_OPTION_CLASS_NAME,
                highlightedIndex === index && "bg-white/82 text-foreground dark:bg-slate-900/86",
              )}
              onMouseEnter={() => setHighlightedIndex(index)}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                applySuggestion(suggestion);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  applySuggestion(suggestion);
                }
              }}
            >
              {suggestion.label}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};
