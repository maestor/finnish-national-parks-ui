const finnishDateFormatter = new Intl.DateTimeFormat("fi-FI", {
  timeZone: "Europe/Helsinki",
});

const finnishLongDateFormatter = new Intl.DateTimeFormat("fi-FI", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Helsinki",
  year: "numeric",
});

const finnishDateInputFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Europe/Helsinki",
  year: "numeric",
});

export const getCurrentFinnishDate = (date = new Date()): string => {
  const parts = Object.fromEntries(
    finnishDateInputFormatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
};

const getFinnishDateParts = (dateStr: string) => {
  const parts = finnishDateFormatter.formatToParts(new Date(dateStr));

  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const year = parts.find((part) => part.type === "year")?.value;

  if (!day || !month || !year) {
    throw new Error(`Failed to extract Finnish date parts from "${dateStr}"`);
  }

  return { day, month, year };
};

export const formatFinnishDate = (dateStr: string): string =>
  finnishDateFormatter.format(new Date(dateStr));

export const formatFinnishLongDate = (dateStr: string): string =>
  finnishLongDateFormatter.format(new Date(`${dateStr}T12:00:00Z`));

export const formatFinnishDateRange = (startDateStr: string, endDateStr: string): string => {
  const start = getFinnishDateParts(startDateStr);
  const end = getFinnishDateParts(endDateStr);

  if (start.day === end.day && start.month === end.month && start.year === end.year) {
    return formatFinnishDate(startDateStr);
  }

  if (start.year === end.year && start.month === end.month) {
    return `${start.day}.-${end.day}.${end.month}.${end.year}`;
  }

  if (start.year === end.year) {
    return `${start.day}.${start.month}.-${end.day}.${end.month}.${end.year}`;
  }

  return `${formatFinnishDate(startDateStr)} - ${formatFinnishDate(endDateStr)}`;
};

export const formatOptionalFinnishDate = (dateStr: string | null): string =>
  dateStr ? formatFinnishDate(dateStr) : "-";
