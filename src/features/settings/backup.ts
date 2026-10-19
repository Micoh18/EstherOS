import {
  ImportError,
  exportDb,
  importDb,
  pickExportPath,
  pickImportPath,
  type ImportErrorCode,
  type ImportResult,
} from "@/shared/db";
import { t, type I18nKey } from "@/shared/i18n";
import { log } from "@/shared/lib/log";

export type ExportOutcome =
  { status: "cancelled" } | { status: "done"; path: string } | { status: "error"; message: string };

export type ImportOutcome =
  | { status: "cancelled" }
  | { status: "done"; result: ImportResult }
  | { status: "error"; code: ImportErrorCode; message: string };

const IMPORT_MESSAGES: Record<ImportErrorCode, I18nKey> = {
  not_sqlite: "settings.data.importError.not_sqlite",
  corrupt: "settings.data.importError.corrupt",
  missing_tables: "settings.data.importError.missing_tables",
  newer_version: "settings.data.importError.newer_version",
  import_failed: "settings.data.importError.import_failed",
  restore_failed: "settings.data.importError.restore_failed",
  unknown: "settings.data.importError.unknown",
};

/** `backupPath` is shown when the previous data could not be restored (`restore_failed`). */
export function importErrorMessage(code: ImportErrorCode, backupPath?: string): string {
  return t(IMPORT_MESSAGES[code], { path: backupPath ?? "backups" });
}

/** Native "save as" with `estheros-backup-<date>.db`, then a compacted copy of the database. */
export async function exportBackup(): Promise<ExportOutcome> {
  try {
    const path = await pickExportPath();
    if (!path) return { status: "cancelled" };
    await exportDb(path);
    return { status: "done", path };
  } catch (error) {
    log.error("export failed", error);
    return { status: "error", message: t("settings.data.exportError") };
  }
}

/**
 * Asks for a backup file and imports it. The native side validates the file before touching the
 * current database, copies it to `backups/` and restores it if anything fails, so an invalid file
 * leaves the data as it was. If even the restore fails (`restore_failed`) the message points to
 * that copy.
 */
export async function importBackup(): Promise<ImportOutcome> {
  let path: string | null;
  try {
    path = await pickImportPath();
  } catch (error) {
    log.error("import dialog failed", error);
    return { status: "error", code: "unknown", message: importErrorMessage("unknown") };
  }
  if (!path) return { status: "cancelled" };
  try {
    return { status: "done", result: await importDb(path) };
  } catch (error) {
    const code = error instanceof ImportError ? error.code : "unknown";
    const backupPath = error instanceof ImportError ? error.backupPath : undefined;
    log.warn("import rejected", code, error);
    return { status: "error", code, message: importErrorMessage(code, backupPath) };
  }
}
