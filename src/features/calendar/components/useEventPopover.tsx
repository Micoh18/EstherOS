import { useId, useRef, useState, type RefObject } from "react";
import { Popover, PopoverAnchor, PopoverContent } from "@/shared/ui";
import type { TimeFormat } from "../format";
import type { EventOccurrence } from "../model";
import { wasJustDragged } from "./dragState";
import { EventDetails } from "./EventPopover";

/**
 * Click on an event: title, time, place, color and tags, with Edit / Duplicate / Delete.
 *
 * The Radix popover is only mounted while it is open, anchored to the event element through
 * `anchorRef`: a month shows dozens of events and mounting a popover trigger and anchor for
 * each one made every period change several times slower. Spread `triggerProps` on the event
 * element, give it `anchorRef` and render `popover` next to it.
 */
export function useEventPopover(occurrence: EventOccurrence, timeFormat: TimeFormat) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLElement | null>(null);
  const contentId = useId();

  const triggerProps = {
    "aria-haspopup": "dialog" as const,
    "aria-expanded": open,
    "aria-controls": open ? contentId : undefined,
    onClick: () => {
      // The click that ends a drag must not open the popover.
      if (wasJustDragged()) return;
      setOpen((current) => !current);
    },
  };

  const popover = open ? (
    <Popover open onOpenChange={setOpen}>
      <PopoverAnchor virtualRef={anchorRef as RefObject<Measurable>} />
      <PopoverContent
        id={contentId}
        className="w-[300px] p-4"
        side="right"
        align="start"
        collisionPadding={16}
        // A click on the event itself toggles through `onClick`, not as an outside click.
        onInteractOutside={(event) => {
          if (anchorRef.current?.contains(event.target as Node)) event.preventDefault();
        }}
        // Without a Radix trigger, give the focus back to the event by hand.
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          anchorRef.current?.focus();
        }}
      >
        <EventDetails
          occurrence={occurrence}
          timeFormat={timeFormat}
          onDone={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  ) : null;

  return { anchorRef, triggerProps, popover };
}

/** What Radix positions the popover against (any element has a bounding box). */
interface Measurable {
  getBoundingClientRect(): DOMRect;
}
