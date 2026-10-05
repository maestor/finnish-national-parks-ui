export const SEASONS = ["winter", "spring", "summer", "autumn"] as const;
export type Season = (typeof SEASONS)[number];

export const SEASON_EMOJIS = {
  winter: "❄️",
  spring: "🌱",
  summer: "☀️",
  autumn: "🍂",
} satisfies Record<Season, string>;

export const getVisitSeason = (visitedOn: string): Season => {
  const month = Number(visitedOn.slice(5, 7));
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
};
