"use client";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

interface AdminTableFilterOption {
  label: string;
  value: string;
}

interface AdminTableFilterSelect {
  id: string;
  label: string;
  options: AdminTableFilterOption[];
  value: string;
  onChange: (value: string) => void;
}

interface AdminTableFiltersProps {
  query: string;
  onQueryChange: (value: string) => void;
  queryLabel: string;
  queryPlaceholder: string;
  selects?: AdminTableFilterSelect[];
  resultCountLabel?: string;
  resetLabel?: string;
  onReset?: () => void;
}

export const AdminTableFilters = ({
  query,
  onQueryChange,
  queryLabel,
  queryPlaceholder,
  selects = [],
  resultCountLabel,
  resetLabel,
  onReset,
}: AdminTableFiltersProps) => {
  const hasActiveFilters =
    query.trim().length > 0 || selects.some((select) => select.value.trim().length > 0);

  return (
    <section className="mt-6 space-y-4 rounded-xl border border-border/70 bg-muted/30 p-4">
      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_repeat(auto-fit,minmax(180px,1fr))]">
        <div className="space-y-2">
          <label htmlFor="admin-table-query" className="text-sm font-medium">
            {queryLabel}
          </label>
          <input
            id="admin-table-query"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={queryPlaceholder}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        {selects.map((select) => (
          <div key={select.id} className="space-y-2">
            <label htmlFor={select.id} className="text-sm font-medium">
              {select.label}
            </label>
            <Select
              id={select.id}
              value={select.value}
              onChange={(event) => select.onChange(event.target.value)}
            >
              {select.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">{resultCountLabel}</p>
        {hasActiveFilters && onReset && resetLabel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onReset} className="w-fit">
            {resetLabel}
          </Button>
        ) : null}
      </div>
    </section>
  );
};
