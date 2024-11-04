export const RANK_BALANCE_RANGES = [
  { label: "Perfectly Balanced", min: 0, max: 0.34 },
  { label: "Slightly Uneven", min: 0.34, max: 1 },
  { label: "Moderately Uneven", min: 1.01, max: 1.5 },
  { label: "Very Uneven", min: 1.51, max: Infinity },
];

export function getRankBalanceLabel(difference: number) {
  const range = RANK_BALANCE_RANGES.find(
    (r) => difference >= r.min && difference <= r.max
  );
  return range ? range.label : "Unknown";
}
