import { z } from "zod";

export const THEMES = ["dark", "white", "pink", "system"] as const;
export const ThemeSettingSchema = z.enum(THEMES);
export type ThemeSetting = z.infer<typeof ThemeSettingSchema>;

/** `{ actionId: "Ctrl+Shift+T" | null }`, only for actions the user changed (`null` = disabled). */
export const KeybindingsSchema = z.record(z.string(), z.string().min(1).nullable());
export type Keybindings = z.infer<typeof KeybindingsSchema>;

export const FONT_SCALES = [0.9, 1, 1.1] as const;
export type FontScale = (typeof FONT_SCALES)[number];

/** Screen opened at startup: always Today, or the last visited route. */
export const START_SCREENS = ["today", "last"] as const;
export type StartScreen = (typeof START_SCREENS)[number];

/**
 * Every setting with its type and default. Keys are snake_case like the `setting` table rows.
 * Keep the defaults in sync with the seed of `0001_init.sql`.
 */
export const SettingsSchema = z.object({
  theme: ThemeSettingSchema.default("pink"),
  week_starts_on: z.number().int().min(0).max(6).default(1),
  time_format: z.enum(["12h", "24h"]).default("24h"),
  default_calendar_view: z.enum(["month", "week", "day"]).default("month"),
  sidebar_collapsed: z.boolean().default(false),
  user_name: z.string().max(60).default(""),
  onboarding_done: z.boolean().default(false),
  keybindings: KeybindingsSchema.default({}),
  font_scale: z.union([z.literal(0.9), z.literal(1), z.literal(1.1)]).default(1),
  reduce_motion: z.boolean().default(false),
  start_screen: z.enum(START_SCREENS).default("today"),
  /** Last visited route, used when `start_screen` is `last`. */
  last_route: z
    .string()
    .regex(/^\/[a-z/-]*$/)
    .max(100)
    .default("/today"),
});
export type Settings = z.infer<typeof SettingsSchema>;
export type SettingKey = keyof Settings;

export const SETTING_KEYS = Object.keys(SettingsSchema.shape) as SettingKey[];

export const SETTING_DEFAULTS: Settings = SettingsSchema.parse({});

export function isSettingKey(key: string): key is SettingKey {
  return key in SettingsSchema.shape;
}

/** Validates one value; `null` when invalid. */
export function parseSettingValue<K extends SettingKey>(
  key: K,
  value: unknown,
): Settings[K] | null {
  const parsed = SettingsSchema.shape[key].safeParse(value);
  return parsed.success ? (parsed.data as Settings[K]) : null;
}

// Pure rules -------------------------------------------------------------------

/**
 * Applies one change to the stored overrides. Choosing the default again removes the override,
 * so only modified actions are stored.
 */
export function applyKeybinding(
  current: Keybindings,
  actionId: string,
  binding: string | null,
  defaultBinding: string | null,
): Keybindings {
  const next = { ...current };
  if (binding === defaultBinding) delete next[actionId];
  else next[actionId] = binding;
  return next;
}

export function resetKeybindingIn(current: Keybindings, actionId: string): Keybindings {
  const next = { ...current };
  delete next[actionId];
  return next;
}
