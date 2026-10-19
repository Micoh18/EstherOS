import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { t } from "@/shared/i18n";
import { todayISO } from "@/shared/lib/dates";
import { emitDbChanged } from "./events";

export interface ImportResult {
  /** Automatic copy of the previous database (`backups/pre-import-<timestamp>.db`). */
  backupPath: string;
  schemaVersion: number;
}

/** Machine-readable reason of a failed import, taken from the Rust error prefix. */
export type ImportErrorCode =
  | "not_sqlite"
  | "corrupt"
  | "missing_tables"
  | "newer_version"
  | "import_failed"
  | "restore_failed"
  | "unknown";

export class ImportError extends Error {
  constructor(
    readonly code: ImportErrorCode,
    message: string,
    /** Copy taken before the import; set when the previous data could not be put back. */
    readonly backupPath?: string,
  ) {
    super(message);
    this.name = "ImportError";
  }
}

const IMPORT_CODES: ImportErrorCode[] = [
  "not_sqlite",
  "corrupt",
  "missing_tables",
  "newer_version",
  "import_failed",
  "restore_failed",
];

const dbFilters = () => [{ name: t("db.backupFileType"), extensions: ["db", "sqlite"] }];

export function suggestedBackupName(date: Date = new Date()): string {
  return `estheros-backup-${todayISO(date)}.db`;
}

/** Writes a compacted copy of the database (`VACUUM INTO`) to `targetPath`. */
export function exportDb(targetPath: string): Promise<void> {
  return invoke("export_db", { targetPath });
}

/**
 * Validates `sourcePath`, backs up the current database, replaces it and reopens the connection.
 * On success every subscriber gets a `*` change so stores reload.
 */
export async function importDb(sourcePath: string): Promise<ImportResult> {
  try {
    const result = await invoke<ImportResult>("import_db", { sourcePath });
    emitDbChanged("*");
    return result;
  } catch (error) {
    const message = String(error);
    const code = IMPORT_CODES.find((c) => message.startsWith(`${c}:`)) ?? "unknown";
    const backupPath = /; backup at (.+)$/.exec(message)?.[1];
    throw new ImportError(code, message, backupPath);
  }
}

export function openDataFolder(): Promise<void> {
  return invoke("open_data_folder");
}

/** Absolute path of the database file, as the Rust side opens it. */
export function dbPath(): Promise<string> {
  return invoke<string>("db_path");
}

export function dbSizeBytes(): Promise<number> {
  return invoke<number>("db_size_bytes");
}

/** Native "save as" dialog with the suggested name. Resolves `null` if cancelled. */
export function pickExportPath(): Promise<string | null> {
  return save({ defaultPath: suggestedBackupName(), filters: dbFilters() });
}

/** Native "open" dialog for a backup file. Resolves `null` if cancelled. */
export async function pickImportPath(): Promise<string | null> {
  const selected = await open({ multiple: false, directory: false, filters: dbFilters() });
  return typeof selected === "string" ? selected : null;
}
