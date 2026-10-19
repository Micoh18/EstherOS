import { useState } from "react";
import { Bow } from "@/shared/icons";
import { t } from "@/shared/i18n";
import { log } from "@/shared/lib/log";
import { Button } from "@/shared/ui";
import { WindowControls } from "../layout/WindowControls";
import { errorDetail } from "./errorDetail";

export interface ErrorScreenProps {
  error: unknown;
  /** React component stack, when the error came from rendering. */
  componentStack?: string | null;
  /** Defaults to reloading the window, which restarts the frontend with a clean state. */
  onRestart?: () => void;
  /**
   * `window` (default) replaces the whole frameless window, so it brings its own drag strip and
   * window controls. `page` fills the content area of a shell that is still alive.
   */
  variant?: "window" | "page";
}

/** Cozy screen shown when the interface crashed. */
export function ErrorScreen({
  error,
  componentStack,
  onRestart,
  variant = "window",
}: ErrorScreenProps) {
  const [copyStatus, setCopyStatus] = useState<"copied" | "failed" | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(errorDetail(error, componentStack));
      setCopyStatus("copied");
    } catch (cause) {
      log.warn("copy error detail", cause);
      setCopyStatus("failed");
    }
  };

  const content = (
    <div
      role="alert"
      className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-bg px-6 text-center text-text"
    >
      <span className="flex size-[64px] items-center justify-center rounded-full bg-accent-soft text-accent">
        <Bow size={34} />
      </span>
      <h1 className="font-display text-2xl font-semibold">{t("shell.error.title")}</h1>
      <p className="max-w-[420px] text-text-muted">{t("shell.error.body")}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={onRestart ?? (() => window.location.reload())}>
          {t("shell.error.restart")}
        </Button>
        <Button variant="soft" onClick={() => void copy()}>
          {t("shell.error.copy")}
        </Button>
      </div>
      <p aria-live="polite" className="min-h-[20px] text-sm text-text-muted">
        {copyStatus === "copied"
          ? t("shell.error.copied")
          : copyStatus === "failed"
            ? t("shell.error.copyFailed")
            : null}
      </p>
    </div>
  );

  if (variant === "page") return content;
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg">
      <div data-tauri-drag-region className="flex h-10 shrink-0 justify-end">
        <WindowControls />
      </div>
      {content}
    </div>
  );
}
