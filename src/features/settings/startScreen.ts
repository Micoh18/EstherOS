import { log } from "@/shared/lib/log";
import { SettingsSchema, type Settings } from "./model";
import { saveSetting } from "./persistence";
import { getAllSettings, getSetting } from "./repository";

const HOME = "/today";
/** Routes worth reopening at startup; anything else (dev pages, unknown) falls back to Today. */
const RESTORABLE = ["/today", "/calendar", "/journal", "/todo", "/settings"];

/** Route to open at startup according to "Pantalla de inicio". */
export function resolveStartPath(settings: Pick<Settings, "start_screen" | "last_route">): string {
  if (settings.start_screen !== "last") return HOME;
  return RESTORABLE.includes(settings.last_route) ? settings.last_route : HOME;
}

/** Reads the settings and resolves the start route; Today when the database is not ready. */
export async function getStartPath(): Promise<string> {
  try {
    return resolveStartPath(await getAllSettings());
  } catch (error) {
    log.warn("Could not read the start screen", error);
    return HOME;
  }
}

/** Remembers the visited route, only while "última visitada" is selected. */
export async function rememberRoute(pathname: string): Promise<void> {
  if (!RESTORABLE.includes(pathname)) return;
  try {
    if ((await getSetting("start_screen")) !== "last") return;
    if (!SettingsSchema.shape.last_route.safeParse(pathname).success) return;
    await saveSetting("last_route", pathname);
  } catch (error) {
    log.warn("Could not remember the route", error);
  }
}
