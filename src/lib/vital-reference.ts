import type { Vital } from "@/lib/consultation";

// Typical resting adult reference intervals, shown beside readings as a
// reading aid. They are not diagnostic thresholds and do not adjust for
// age, pregnancy or clinical context.
const adult: Partial<Record<Vital, readonly [number, number]>> = {
  systolic: [90, 139],
  diastolic: [60, 89],
  pulse: [60, 100],
  temperature: [36.1, 37.5],
  respiratory: [12, 20],
  oxygen: [95, 100],
};

export function referenceRange(code: Vital) {
  const range = adult[code];
  return range ? `${range[0]}–${range[1]}` : null;
}

export function referenceFlag(code: Vital, value: number): "H" | "L" | null {
  const range = adult[code];
  if (!range || !Number.isFinite(value)) return null;
  if (value > range[1]) return "H";
  if (value < range[0]) return "L";
  return null;
}
