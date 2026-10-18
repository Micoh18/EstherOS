/** Time of the last finished drag; the click that follows a drop is ignored. */
let lastDragEnd = 0;

const CLICK_GRACE_MS = 250;

export function markDragEnd(): void {
  lastDragEnd = Date.now();
}

export function wasJustDragged(): boolean {
  return Date.now() - lastDragEnd < CLICK_GRACE_MS;
}
