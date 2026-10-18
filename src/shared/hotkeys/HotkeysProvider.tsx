import { useEffect, type ReactNode } from "react";
import { handleKeyDown } from "./useHotkey";

/** Installs the app's single `keydown` listener on `window`. Mount it once, near the root. */
export function HotkeysProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      handleKeyDown(event);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  return children;
}
