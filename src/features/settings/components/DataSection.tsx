import { useCallback, useEffect, useState } from "react";
import { appConfigDir, join } from "@tauri-apps/api/path";
import { Download, FolderOpen, TriangleAlert, Upload } from "lucide-react";
import { dbSizeBytes, onDbChanged, openDataFolder } from "@/shared/db";
import { log } from "@/shared/lib/log";
import { Button, Input } from "@/shared/ui";
import { t } from "@/shared/i18n";
import { exportBackup, importBackup } from "../backup";
import { wipeAllData } from "../repository";
import { SettingRow, SettingsSection } from "./SettingsLayout";

/** File name of the database inside the app folder (see `DB_URL`). */
const DB_FILE = "estheros.db";

type Status = { tone: "ok" | "error"; text: string } | null;

function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 || value >= 10 ? 0 : 1;
  return `${new Intl.NumberFormat("es", { maximumFractionDigits: digits }).format(value)} ${units[unit]}`;
}

function useDbInfo() {
  const [path, setPath] = useState<string | null>(null);
  const [size, setSize] = useState<number | null>(null);
  const loadSize = useCallback(() => {
    dbSizeBytes().then(setSize, (error: unknown) => log.warn("db size", error));
  }, []);
  useEffect(() => {
    appConfigDir()
      .then((dir) => join(dir, DB_FILE))
      .then(setPath, (error: unknown) => log.warn("db path", error));
    loadSize();
    return onDbChanged("*", loadSize);
  }, [loadSize]);
  return { path, size };
}

function StatusLine({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p
      role={status.tone === "error" ? "alert" : "status"}
      className={status.tone === "error" ? "text-sm text-danger" : "text-sm text-success"}
    >
      {status.text}
    </p>
  );
}

function ImportControl() {
  const [warning, setWarning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const run = async () => {
    setBusy(true);
    const outcome = await importBackup();
    setBusy(false);
    if (outcome.status === "cancelled") return;
    setWarning(false);
    setStatus(
      outcome.status === "done"
        ? { tone: "ok", text: t("settings.data.imported", { path: outcome.result.backupPath }) }
        : { tone: "error", text: outcome.message },
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <SettingRow label={t("settings.data.importTitle")} hint={t("settings.data.importHint")}>
        <Button
          variant="soft"
          onClick={() => {
            setStatus(null);
            setWarning(true);
          }}
        >
          <Upload aria-hidden />
          {t("settings.data.import")}
        </Button>
      </SettingRow>
      {warning ? (
        <div className="flex flex-col gap-3 rounded-md bg-bg-elevated p-4 text-sm" role="alert">
          <p className="flex gap-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            {t("settings.data.importWarning")}
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void run()} disabled={busy}>
              {t("settings.data.importChoose")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setWarning(false)}>
              {t("settings.common.cancel")}
            </Button>
          </div>
        </div>
      ) : null}
      <StatusLine status={status} />
    </div>
  );
}

function WipeControl() {
  const word = t("settings.data.wipeWord");
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [typed, setTyped] = useState("");
  const [status, setStatus] = useState<Status>(null);

  const close = () => {
    setStep(0);
    setTyped("");
  };

  const wipe = async () => {
    try {
      await wipeAllData();
      close();
      setStatus({ tone: "ok", text: t("settings.data.wiped") });
    } catch (error) {
      log.error("wipe failed", error);
      setStatus({ tone: "error", text: t("settings.data.wipeError") });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <SettingRow label={t("settings.data.wipeTitle")} hint={t("settings.data.wipeHint")}>
        <Button
          variant="danger"
          onClick={() => {
            setStatus(null);
            setStep(1);
          }}
        >
          {t("settings.data.wipe")}
        </Button>
      </SettingRow>
      {step > 0 ? (
        <div className="flex flex-col gap-3 rounded-md bg-danger/10 p-4 text-sm" role="alert">
          <p className="flex gap-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
            {t("settings.data.wipeWarning")}
          </p>
          {step === 1 ? (
            <div className="flex gap-2">
              <Button size="sm" variant="danger" onClick={() => setStep(2)}>
                {t("settings.data.wipeContinue")}
              </Button>
              <Button size="sm" variant="ghost" onClick={close}>
                {t("settings.common.cancel")}
              </Button>
            </div>
          ) : (
            <form
              className="flex flex-col gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (typed === word) void wipe();
              }}
            >
              <label htmlFor="settings-wipe-confirm" className="font-semibold">
                {t("settings.data.wipeTypeLabel", { word })}
              </label>
              <div className="flex flex-wrap gap-2">
                <Input
                  id="settings-wipe-confirm"
                  size="sm"
                  autoFocus
                  autoComplete="off"
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                  className="w-[180px]"
                />
                <Button type="submit" size="sm" variant="danger" disabled={typed !== word}>
                  {t("settings.data.wipeConfirm")}
                </Button>
                <Button size="sm" variant="ghost" onClick={close}>
                  {t("settings.common.cancel")}
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : null}
      <StatusLine status={status} />
    </div>
  );
}

export function DataSection() {
  const { path, size } = useDbInfo();
  const [exportStatus, setExportStatus] = useState<Status>(null);
  const [folderError, setFolderError] = useState(false);

  const runExport = async () => {
    setExportStatus(null);
    const outcome = await exportBackup();
    if (outcome.status === "done") {
      setExportStatus({ tone: "ok", text: t("settings.data.exported", { path: outcome.path }) });
    } else if (outcome.status === "error") {
      setExportStatus({ tone: "error", text: outcome.message });
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <SettingsSection
        title={t("settings.data.location")}
        description={t("settings.data.locationHint")}
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md bg-bg-elevated px-3 py-2 font-mono text-sm text-text-muted select-all">
              {path ?? t("settings.data.unknown")}
            </code>
            <Button
              variant="soft"
              onClick={() => {
                setFolderError(false);
                openDataFolder().catch((error: unknown) => {
                  log.warn("open folder", error);
                  setFolderError(true);
                });
              }}
            >
              <FolderOpen aria-hidden />
              {t("settings.data.openFolder")}
            </Button>
          </div>
          {folderError ? (
            <p role="alert" className="text-sm text-danger">
              {t("settings.data.openFolderError")}
            </p>
          ) : null}
          <p className="text-sm text-text-muted">
            {t("settings.data.size")}:{" "}
            <span className="font-semibold text-text">
              {size === null ? t("settings.data.unknown") : formatBytes(size)}
            </span>
          </p>
        </div>
      </SettingsSection>

      <SettingsSection title={t("settings.data.backups")}>
        <div>
          <div className="flex flex-col gap-2">
            <SettingRow label={t("settings.data.exportTitle")} hint={t("settings.data.exportHint")}>
              <Button onClick={() => void runExport()}>
                <Download aria-hidden />
                {t("settings.data.export")}
              </Button>
            </SettingRow>
            <StatusLine status={exportStatus} />
          </div>
          <ImportControl />
          <WipeControl />
        </div>
      </SettingsSection>
    </div>
  );
}
