// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onDbChanged, setDbExecutor, type DbExecutor } from "@/shared/db";
import { importBackup } from "../backup";

const tauri = vi.hoisted(() => ({
  invoke: vi.fn(),
  open: vi.fn(),
  save: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke: tauri.invoke }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: tauri.open, save: tauri.save }));

/** Executor that fails the test if anything reaches the database. */
function untouchableDb(): DbExecutor & { calls: number } {
  const executor = {
    calls: 0,
    async select() {
      executor.calls += 1;
      return [];
    },
    async execute() {
      executor.calls += 1;
      return { rowsAffected: 0 };
    },
    async batch() {
      executor.calls += 1;
    },
  };
  return executor;
}

let db: ReturnType<typeof untouchableDb>;
let changes: string[];
let offChanges: () => void;

beforeEach(() => {
  vi.clearAllMocks();
  db = untouchableDb();
  setDbExecutor(db);
  changes = [];
  offChanges = onDbChanged("*", (table) => changes.push(table));
});

afterEach(() => {
  offChanges();
  setDbExecutor(null);
});

describe("importBackup", () => {
  it("an invalid file shows a clear error and leaves the database alone", async () => {
    tauri.open.mockResolvedValue("C:/Users/me/Desktop/notes.txt");
    tauri.invoke.mockRejectedValue("not_sqlite: file is not a SQLite database");

    const outcome = await importBackup();

    expect(outcome).toEqual({
      status: "error",
      code: "not_sqlite",
      message: expect.stringContaining("no es una copia de Estheros"),
    });
    expect(tauri.invoke).toHaveBeenCalledTimes(1);
    expect(tauri.invoke).toHaveBeenCalledWith("import_db", {
      sourcePath: "C:/Users/me/Desktop/notes.txt",
    });
    expect(db.calls).toBe(0);
    expect(changes).toEqual([]);
  });

  it("maps every native error code to a message", async () => {
    tauri.open.mockResolvedValue("C:/backup.db");
    tauri.invoke.mockRejectedValue("missing_tables: no task table");
    expect(await importBackup()).toMatchObject({ status: "error", code: "missing_tables" });

    tauri.invoke.mockRejectedValue("something odd");
    expect(await importBackup()).toMatchObject({ status: "error", code: "unknown" });
    expect(changes).toEqual([]);
  });

  it("does nothing when the dialog is cancelled", async () => {
    tauri.open.mockResolvedValue(null);
    expect(await importBackup()).toEqual({ status: "cancelled" });
    expect(tauri.invoke).not.toHaveBeenCalled();
  });

  it("a valid backup reloads every store", async () => {
    tauri.open.mockResolvedValue("C:/backup.db");
    tauri.invoke.mockResolvedValue({
      backupPath: "C:/data/backups/pre-import.db",
      schemaVersion: 1,
    });

    const outcome = await importBackup();

    expect(outcome).toEqual({
      status: "done",
      result: { backupPath: "C:/data/backups/pre-import.db", schemaVersion: 1 },
    });
    expect(changes).toEqual(["*"]);
  });
});
