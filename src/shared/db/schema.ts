import { z } from "zod";
import {
  isValidDateISO,
  isValidLocalDateTime,
  TIME_HM_RE,
  YEAR_MONTH_RE,
} from "@/shared/lib/dates";

/** SQLite stores booleans as 0/1. */
export const sqlBool = z.union([z.number(), z.boolean()]).transform((value) => Boolean(value));

export const toSqlBool = (value: boolean): 0 | 1 => (value ? 1 : 0);

export const dateISOSchema = z.string().refine(isValidDateISO, "Expected YYYY-MM-DD");
export const localDateTimeSchema = z
  .string()
  .refine(isValidLocalDateTime, "Expected YYYY-MM-DDTHH:mm:ss");
export const timeHMSchema = z.string().regex(TIME_HM_RE, "Expected HH:mm");
export const yearMonthSchema = z.string().regex(YEAR_MONTH_RE, "Expected YYYY-MM");
export const utcTimestampSchema = z.string().min(1);

/** Palette keys of the theme. Colors are never stored as hex so they follow the theme. */
export const COLOR_KEYS = ["rose", "lavender", "sage", "butter", "sky", "peach"] as const;
export const colorKeySchema = z.enum(COLOR_KEYS);
export type ColorKey = z.infer<typeof colorKeySchema>;

/** Optional free text: empty strings are stored as NULL. */
export const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .nullish()
    .transform((value) => (value && value.trim() !== "" ? value : null));
