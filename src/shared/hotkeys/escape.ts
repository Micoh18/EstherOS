import { useEffect, type RefObject } from "react";

/** Event dispatched on the topmost `[data-escape-close]` element when `app.escape` fires. */
export const ESCAPE_CLOSE_EVENT = "hotkeys:escape-close";

/** Asks the last `[data-escape-close]` element in the document to close. False if none. */
export function closeTopmostEscapable(root: ParentNode = document): boolean {
  const candidates = root.querySelectorAll("[data-escape-close]");
  const topmost = candidates[candidates.length - 1];
  if (!topmost) return false;
  topmost.dispatchEvent(new CustomEvent(ESCAPE_CLOSE_EVENT));
  return true;
}

/** Calls `onClose` when `app.escape` targets the element (which needs `data-escape-close`). */
export function useEscapeClose(ref: RefObject<HTMLElement | null>, onClose: () => void): void {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.addEventListener(ESCAPE_CLOSE_EVENT, onClose);
    return () => element.removeEventListener(ESCAPE_CLOSE_EVENT, onClose);
  }, [ref, onClose]);
}
