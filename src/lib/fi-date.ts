const finnishDateFormatter = new Intl.DateTimeFormat("fi-FI", {
  timeZone: "Europe/Helsinki",
});

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
