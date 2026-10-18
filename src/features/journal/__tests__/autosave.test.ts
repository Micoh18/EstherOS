import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAutosaver, type SaveStatus } from "../autosave";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function setup(save = vi.fn(async () => {})) {
  const statuses: SaveStatus[] = [];
  const saver = createAutosaver({ save, onStatus: (status) => statuses.push(status) });
  return { save, saver, statuses };
}

describe("autosave", () => {
  it("saves once, 800 ms after the last change", async () => {
    const { save, saver } = setup();
    saver.touch();
    await vi.advanceTimersByTimeAsync(500);
    saver.touch();
    await vi.advanceTimersByTimeAsync(799);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("flush saves immediately and cancels the pending debounce", async () => {
    const { save, saver, statuses } = setup();
    saver.touch();
    await saver.flush();
    expect(save).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2000);
    expect(save).toHaveBeenCalledTimes(1);
    expect(statuses).toEqual(["pending", "saving", "saved"]);
  });

  it("does nothing without changes", async () => {
    const { save, saver } = setup();
    expect(await saver.flush()).toBe(true);
    expect(save).not.toHaveBeenCalled();
  });

  it("serializes saves and saves again for changes made while saving", async () => {
    let resolve: () => void = () => {};
    const save = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    const { saver } = setup(save);

    saver.touch();
    const first = saver.flush();
    saver.touch();
    const second = saver.flush();
    expect(save).toHaveBeenCalledTimes(1);

    resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenCalledTimes(2);
    resolve();
    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    expect(saver.hasPendingChanges()).toBe(false);
  });

  it("keeps the changes and retries every 5 s after a failure", async () => {
    const save = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("disk"))
      .mockRejectedValueOnce(new Error("disk"))
      .mockResolvedValue(undefined);
    const { saver, statuses } = setup(save);

    saver.touch();
    expect(await saver.flush()).toBe(false);
    expect(saver.hasPendingChanges()).toBe(true);
    await vi.advanceTimersByTimeAsync(4999);
    expect(save).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(5000);
    expect(save).toHaveBeenCalledTimes(3);
    expect(statuses.at(-1)).toBe("saved");
    await vi.advanceTimersByTimeAsync(20000);
    expect(save).toHaveBeenCalledTimes(3);
  });

  it("cancel drops unsaved changes", async () => {
    const { save, saver } = setup();
    saver.touch();
    saver.cancel();
    await vi.advanceTimersByTimeAsync(2000);
    await saver.flush();
    expect(save).not.toHaveBeenCalled();
  });
});
