import { test as base, expect } from "@playwright/test";
import { FakeBackend } from "./backend";

type Reply = { ok: true; value: unknown } | { ok: false; error: string };

declare global {
  interface Window {
    __e2eInvoke(cmd: string, args: Record<string, unknown>): Promise<Reply>;
  }
}

/**
 * Runs in the page before the app: a minimal `__TAURI_INTERNALS__` whose `invoke` forwards
 * every IPC call to the Node-side `FakeBackend`. `isTauri()` stays false, so the window
 * controls do not try to drive a native window.
 */
function installTauriShim() {
  let nextCallback = 1;
  Object.defineProperty(window, "__TAURI_INTERNALS__", {
    value: {
      metadata: {
        currentWindow: { label: "main" },
        currentWebview: { windowLabel: "main", label: "main" },
      },
      async invoke(cmd: string, args: Record<string, unknown> = {}) {
        const reply = await window.__e2eInvoke(cmd, args);
        if (!reply.ok) throw reply.error;
        return reply.value;
      },
      transformCallback(callback: (payload: unknown) => void) {
        const id = nextCallback++;
        (window as unknown as Record<string, unknown>)[`_${id}`] = callback;
        return id;
      },
      unregisterCallback(id: number) {
        delete (window as unknown as Record<string, unknown>)[`_${id}`];
      },
      convertFileSrc: (path: string) => path,
    },
  });
}

export const test = base.extend<{ backend: FakeBackend }>({
  backend: [
    async ({ page }, use) => {
      const backend = new FakeBackend();
      await page.exposeFunction("__e2eInvoke", (cmd: string, args: Record<string, unknown>) => {
        try {
          return { ok: true, value: backend.handle(cmd, args) } satisfies Reply;
        } catch (error) {
          return { ok: false, error: String(error) } satisfies Reply;
        }
      });
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      await page.addInitScript(installTauriShim);
      await use(backend);
      // Close the app before its database goes away, so pending reads do not log errors.
      await page.close();
      backend.dispose();
      expect(backend.unhandled, "IPC commands without a fake").toEqual([]);
      expect(pageErrors, "uncaught errors in the page").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
