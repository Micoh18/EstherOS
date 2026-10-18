/** Theme names, matching `<html data-theme="...">` and ./themes/<name>.css. */
export const THEMES = ["pink", "white", "dark"] as const;
export type ThemeName = (typeof THEMES)[number];
export const DEFAULT_THEME: ThemeName = "pink";

/** Assignable palette keys (`--palette-<key>`), used by events, lists and tags. */
export const PALETTE_COLORS = ["rose", "lavender", "sage", "butter", "sky", "peach"] as const;
export type PaletteColor = (typeof PALETTE_COLORS)[number];

/** Journal mood scale keys (`--mood-<key>`), from best to worst. */
export const MOODS = ["great", "good", "okay", "low", "bad"] as const;
export type Mood = (typeof MOODS)[number];

export const paletteVar = (color: PaletteColor) => `var(--palette-${color})`;
export const moodVar = (mood: Mood) => `var(--mood-${mood})`;

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}
