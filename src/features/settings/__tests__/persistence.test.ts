import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emitDbChanged, setDbExecutor, createTag, setTagsFor } from "@/shared/db";
import {
  getEffectiveBinding,
  replaceOverrides,
  resetAll,
  setBinding,
  useKeybindingsStore,
} from "@/shared/hotkeys";
import { bindSetting } from "../persistence";
import { countTagUsage, getAllSettings, getSetting, setSetting, wipeAllData } from "../repository";
import { SETTING_DEFAULTS } from "../model";
import { resolveStartPath } from "../startScreen";
import { useMemoryDb } from "../../../../tests/unit/helpers/memoryDb";

function bindKeybindings() {
  return bindSetting("keybindings", {
    read: () => useKeybindingsStore.getState().overrides,
    apply: replaceOverrides,
    subscribe: (onChange) =>
      useKeybindingsStore.subscribe((state, prev) => {
        if (state.overrides !== prev.overrides) {
          onChange(state.overrides as Record<string, string | null>);
        }
      }),
  });
}

let db: ReturnType<typeof useMemoryDb>["raw"];
let unbind: (() => void) | undefined;

beforeEach(() => {
  localStorage.clear();
  resetAll();
  db = useMemoryDb().raw;
});

afterEach(() => {
  unbind?.();
  unbind = undefined;
  setDbExecutor(null);
  db.close();
});

describe("keybindings in the settings table", () => {
  it("stores only modified actions and reset all empties the setting", async () => {
    unbind = bindKeybindings();
    setBinding("calendar.goToToday", "H");
    setBinding("todo.delete", null);
    await vi.waitFor(async () =>
      expect(await getSetting("keybindings")).toEqual({
        "calendar.goToToday": "H",
        "todo.delete": null,
      }),
    );

    resetAll();
    await vi.waitFor(async () => expect(await getSetting("keybindings")).toEqual({}));
    expect(getEffectiveBinding("calendar.goToToday")).toBe("T");
  });

  it("the database wins over the localStorage cache and reloads after an import", async () => {
    await setSetting("keybindings", { "calendar.goToToday": "H" });
    unbind = bindKeybindings();
    await vi.waitFor(() => expect(getEffectiveBinding("calendar.goToToday")).toBe("H"));
    expect(localStorage.getItem("estheros.keybindings")).toContain("H");

    // An import swaps the whole database.
    db.prepare("UPDATE setting SET value_json = ? WHERE key = 'keybindings'").run(
      JSON.stringify({ "nav.today": "Ctrl+Shift+1" }),
    );
    emitDbChanged("*");
    await vi.waitFor(() => expect(getEffectiveBinding("nav.today")).toBe("Ctrl+Shift+1"));
    expect(getEffectiveBinding("calendar.goToToday")).toBe("T");
  });
});

describe("settings repository additions", () => {
  it("counts tag uses across events, entries and tasks", async () => {
    const tag = await createTag({ name: "casa" });
    const unused = await createTag({ name: "nada" });
    db.prepare(
      "INSERT INTO task (id, list_id, title, sort_order, created_at, updated_at) VALUES ('t1', 'inbox', 'x', 0, 'now', 'now')",
    ).run();
    await setTagsFor("task", "t1", [tag.id]);
    const usage = await countTagUsage();
    expect(usage.get(tag.id)).toBe(1);
    expect(usage.get(unused.id)).toBe(0);
  });

  it("wipe restores the first-run state", async () => {
    await setSetting("onboarding_done", true);
    await setSetting("user_name", "Esther");
    await createTag({ name: "casa" });
    await wipeAllData();
    expect(await getAllSettings()).toEqual(SETTING_DEFAULTS);
    expect(db.prepare("SELECT COUNT(*) AS n FROM tag").get()).toEqual({ n: 0 });
    expect(db.prepare("SELECT id FROM todo_list").all()).toEqual([{ id: "inbox" }]);
  });

  it("resolves the start screen", () => {
    expect(resolveStartPath({ start_screen: "today", last_route: "/journal" })).toBe("/today");
    expect(resolveStartPath({ start_screen: "last", last_route: "/journal" })).toBe("/journal");
    expect(resolveStartPath({ start_screen: "last", last_route: "/dev/ui" })).toBe("/today");
  });
});
