import { addDaysISO, type DateISO } from "@/shared/lib/dates";
import type { TaskPriority } from "./model";

export interface QuickAddResult {
  /** Title without the recognized tokens. Empty when the input only had tokens. */
  title: string;
  priority?: TaskPriority;
  dueDate?: DateISO;
}

const PRIORITY_TOKENS: Record<string, TaskPriority> = {
  "!alta": "high",
  "!media": "medium",
  "!baja": "low",
};

/** Day offsets from today. `@manana` is accepted for keyboards without ñ. */
const DUE_TOKENS: Record<string, number> = {
  "@hoy": 0,
  "@mañana": 1,
  "@manana": 1,
};

/**
 * Light natural-language parsing for quick capture (v1): `!alta`, `!media`, `!baja` set the
 * priority and `@hoy`, `@mañana` the due date. Tokens are whole words, case-insensitive, and the
 * last one of each kind wins. Everything else is the title.
 */
export function parseQuickAdd(input: string, today: DateISO): QuickAddResult {
  const kept: string[] = [];
  let priority: TaskPriority | undefined;
  let dueDate: DateISO | undefined;

  for (const word of input.normalize("NFC").trim().split(/\s+/)) {
    if (!word) continue;
    const token = word.toLocaleLowerCase("es");
    if (Object.hasOwn(PRIORITY_TOKENS, token)) {
      priority = PRIORITY_TOKENS[token];
    } else if (Object.hasOwn(DUE_TOKENS, token)) {
      dueDate = addDaysISO(today, DUE_TOKENS[token]);
    } else {
      kept.push(word);
    }
  }

  const result: QuickAddResult = { title: kept.join(" ") };
  if (priority) result.priority = priority;
  if (dueDate) result.dueDate = dueDate;
  return result;
}
