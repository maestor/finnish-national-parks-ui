const finnishDateFormatter = new Intl.DateTimeFormat("fi-FI", {
  timeZone: "Europe/Helsinki",
});

export const formatFinnishDate = (dateStr: string): string =>
  finnishDateFormatter.format(new Date(dateStr));

export const formatOptionalFinnishDate = (dateStr: string | null): string =>
  dateStr ? formatFinnishDate(dateStr) : "-";
