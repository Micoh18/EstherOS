import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";

const ROOT = process.cwd();
const MIGRATION = join(ROOT, "src-tauri", "migrations", "0001_init.sql");
const VERSION = (
  JSON.parse(readFileSync(join(ROOT, "src-tauri", "tauri.conf.json"), "utf8")) as {
    version: string;
  }
).version;

type Args = Record<string, unknown>;
type Value = string | number | bigint | null | Buffer;

/** Tauri sends JSON values; SQLite bindings only take numbers, strings, null and blobs. */
const bindable = (values: unknown): Value[] =>
  ((values as unknown[] | undefined) ?? []).map((value) => {
    if (typeof value === "boolean") return value ? 1 : 0;
    if (value === undefined) return null;
    return value as Value;
  });

/**
 * Stand-in for the Rust side while the smoke tests run against `npm run dev` in a browser.
 * It answers the same IPC commands the webview sends (SQL plugin, backup commands, dialogs)
 * with a real SQLite database built from the app's migration, so every repository runs its
 * actual SQL. Native dialogs are answered from `nextSavePath` / `nextOpenPath`.
 */
export class FakeBackend {
  readonly dir = mkdtempSync(join(tmpdir(), "estheros-e2e-"));
  readonly db: Database.Database;
  /** Every command received, in order (`plugin:sql|select` and friends included). */
  readonly calls: { cmd: string; args: Args }[] = [];
  /** Commands the page sent that this backend does not know. A smoke test expects none. */
  readonly unhandled: string[] = [];
  nextSavePath: string | null = null;
  nextOpenPath: string | null = null;
  private listenerId = 0;

  constructor() {
    this.db = new Database(":memory:");
    // The sqlx connection used by the app enables foreign keys by default.
    this.db.pragma("foreign_keys = ON");
    this.db.exec(readFileSync(MIGRATION, "utf8"));
  }

  private run(sql: string, values: unknown) {
    const statement = this.db.prepare(sql);
    const params = bindable(values);
    if (statement.reader) return { rows: statement.all(...params), changes: 0, lastId: 0 };
    const info = statement.run(...params);
    return { rows: [], changes: info.changes, lastId: Number(info.lastInsertRowid) };
  }

  /** Same contract as `invoke`: resolves with the command's value or throws its error string. */
  handle(cmd: string, args: Args): unknown {
    this.calls.push({ cmd, args });
    switch (cmd) {
      case "plugin:sql|load":
        return args.db;
      case "plugin:sql|select":
        return this.run(String(args.query), args.values).rows;
      case "plugin:sql|execute": {
        const result = this.run(String(args.query), args.values);
        return [result.changes, result.lastId];
      }
      case "plugin:sql|close":
        return true;
      case "db_batch": {
        const statements = args.statements as { sql: string; params: unknown[] }[];
        let affected = 0;
        this.db.transaction(() => {
          for (const { sql, params } of statements) affected += this.run(sql, params).changes;
        })();
        return affected;
      }
      case "export_db":
        this.db.prepare("VACUUM INTO ?").run(String(args.targetPath));
        return null;
      case "db_path":
        return join(this.dir, "estheros.db");
      case "db_size_bytes":
        return this.db.serialize().byteLength;
      case "open_data_folder":
        return null;
      case "plugin:dialog|save":
        return this.take("nextSavePath");
      case "plugin:dialog|open":
        return this.take("nextOpenPath");
      case "plugin:app|version":
        return VERSION;
      case "plugin:event|listen":
        return ++this.listenerId;
      case "plugin:event|unlisten":
        return null;
      default:
        if (cmd.startsWith("plugin:window|")) return null;
        this.unhandled.push(cmd);
        throw `unhandled command in the e2e backend: ${cmd}`;
    }
  }

  private take(key: "nextSavePath" | "nextOpenPath"): string | null {
    const value = this[key];
    this[key] = null;
    return value;
  }

  /** Decoded `setting.value_json`, or `undefined` if the key is missing. */
  setting(key: string): unknown {
    const row = this.db.prepare("SELECT value_json FROM setting WHERE key = ?").get(key) as
      { value_json: string } | undefined;
    return row ? JSON.parse(row.value_json) : undefined;
  }

  /** Writes settings before the page loads (e.g. to start past the onboarding). */
  setSettings(values: Record<string, unknown>): void {
    const upsert = this.db.prepare(
      "INSERT INTO setting (key, value_json) VALUES (?, ?) " +
        "ON CONFLICT (key) DO UPDATE SET value_json = excluded.value_json",
    );
    for (const [key, value] of Object.entries(values)) upsert.run(key, JSON.stringify(value));
  }

  /** Path inside this backend's temporary folder (for dialog answers). */
  file(name: string): string {
    return join(this.dir, name);
  }

  fileSize(path: string): number {
    return statSync(path).size;
  }

  dispose(): void {
    this.db.close();
    rmSync(this.dir, { recursive: true, force: true });
  }
}
