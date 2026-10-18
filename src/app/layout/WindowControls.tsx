import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Copy, Minus, Square, X } from "lucide-react";
import { t } from "@/shared/i18n";

const appWindow = () => (isTauri() ? getCurrentWindow() : null);

function useIsMaximized(): boolean {
  const [maximized, setMaximized] = useState(false);
  useEffect(() => {
    const win = appWindow();
    if (!win) return;
    let active = true;
    const refresh = () =>
      win.isMaximized().then((value) => {
        if (active) setMaximized(value);
      });
    void refresh();
    const unlisten = win.onResized(() => void refresh());
    return () => {
      active = false;
      void unlisten.then((stop) => stop());
    };
  }, []);
  return maximized;
}

const controlClass =
  "inline-flex h-10 w-11 items-center justify-center text-text-muted transition-colors duration-(--dur-fast) focus-visible:outline-none focus-visible:bg-surface-hover";

/** Minimize, maximize/restore and close, drawn by the app because the window has no frame. */
export function WindowControls() {
  const maximized = useIsMaximized();
  const maximizeLabel = maximized ? t("shell.titleBar.restore") : t("shell.titleBar.maximize");

  return (
    <div className="flex h-full items-stretch">
      <button
        type="button"
        className={`${controlClass} hover:bg-surface-hover hover:text-text`}
        aria-label={t("shell.titleBar.minimize")}
        title={t("shell.titleBar.minimize")}
        onClick={() => void appWindow()?.minimize()}
      >
        <Minus size={16} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        className={`${controlClass} hover:bg-surface-hover hover:text-text`}
        aria-label={maximizeLabel}
        title={maximizeLabel}
        onClick={() => void appWindow()?.toggleMaximize()}
      >
        {maximized ? (
          <Copy size={14} strokeWidth={1.75} className="-scale-x-100" />
        ) : (
          <Square size={13} strokeWidth={1.75} />
        )}
      </button>
      <button
        type="button"
        className={`${controlClass} hover:bg-danger hover:text-on-accent`}
        aria-label={t("shell.titleBar.close")}
        title={t("shell.titleBar.close")}
        onClick={() => void appWindow()?.close()}
      >
        <X size={16} strokeWidth={1.75} />
      </button>
    </div>
  );
}
