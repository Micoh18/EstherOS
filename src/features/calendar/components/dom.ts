import type { SyntheticEvent } from "react";

/**
 * True when the event comes from the element's own DOM. React bubbles events from portals
 * (the event popover) through their React parents, which must not react to those clicks.
 */
export function isOwnDomEvent(event: SyntheticEvent): boolean {
  return event.currentTarget.contains(event.target as Node);
}

/** True for presses on the empty area of a cell or column (not on an event, not in a portal). */
export function isEmptyAreaEvent(event: SyntheticEvent): boolean {
  return isOwnDomEvent(event) && !(event.target as Element).closest("[data-event-block]");
}
