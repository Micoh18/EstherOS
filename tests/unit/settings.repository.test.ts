// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import {
  SETTING_DEFAULTS,
  getAllSettings,
  getSetting,
  resetAllKeybindings,
  resetKeybinding,
  setKeybinding,
  setSetting,
} from "@/features/settings";
import { useMemoryDb, type MemoryDb } from "./helpers/memoryDb";

let db: MemoryDb;

beforeEach(() => {
  db = useMemoryDb();
});

describe("settings", () => {
  it("the migration seeds every default", async () => {
    expect(await getAllSettings()).toEqual(SETTING_DEFAULTS);
    expect(await getSetting("theme")).toBe("pink");
    expect(await getSetting("week_starts_on")).toBe(1);
    expect(await getSetting("keybindings")).toEqual({});
  });

  it("override persists and is typed", async () => {
    await setSetting("theme", "dark");
    await setSetting("week_starts_on", 0);
    await setSetting("user_name", "Esther");
    expect(await getSetting("theme")).toBe("dark");
    expect((await getAllSettings()).week_starts_on).toBe(0);
    expect(await getSetting("user_name")).toBe("Esther");
  });

  it("rejects invalid values and falls back on corrupt rows", async () => {
    // @ts-expect-error invalid theme on purpose
    await expect(setSetting("theme", "neon")).rejects.toThrow();
    db.raw.prepare("UPDATE setting SET value_json = '{bad' WHERE key = 'font_scale'").run();
    db.raw.prepare("DELETE FROM setting WHERE key = 'reduce_motion'").run();
    expect(await getSetting("font_scale")).toBe(1);
    expect(await getSetting("reduce_motion")).toBe(false);
  });

  it("keybindings store only modified actions", async () => {
    await setKeybinding("calendar.goToToday", "H", "T");
    await setKeybinding("todo.delete", null, "Delete");
    await setKeybinding("nav.calendar", "Ctrl+2", "Ctrl+2");
    expect(await getSetting("keybindings")).toEqual({
      "calendar.goToToday": "H",
      "todo.delete": null,
    });

    await setKeybinding("calendar.goToToday", "T", "T");
    expect(await getSetting("keybindings")).toEqual({ "todo.delete": null });

    await resetKeybinding("todo.delete");
    expect(await getSetting("keybindings")).toEqual({});

    await setKeybinding("todo.delete", null, "Delete");
    await resetAllKeybindings();
    expect(await getSetting("keybindings")).toEqual({});
  });
});
