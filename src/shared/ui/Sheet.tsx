import type { ComponentProps } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "./cn";
import { overlayClass } from "./Dialog";
import { IconButton } from "./IconButton";
import { uiStrings } from "./strings";

/** Side panel built on the Dialog primitive. */
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

const sheetContentVariants = cva(
  [
    "fixed inset-y-0 z-50 flex w-[min(92vw,400px)] flex-col overflow-y-auto",
    "border-border bg-surface p-6 text-text shadow-(--shadow-lg) outline-none",
  ],
  {
    variants: {
      side: {
        right: "ui-sheet-right right-0 rounded-l-xl border-l",
        left: "ui-sheet-left left-0 rounded-r-xl border-r",
      },
    },
    defaultVariants: { side: "right" },
  },
);

export interface SheetContentProps
  extends
    ComponentProps<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetContentVariants> {
  showClose?: boolean;
}

export function SheetContent({
  side,
  showClose = true,
  className,
  children,
  ...props
}: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlayClass} />
      <DialogPrimitive.Content className={cn(sheetContentVariants({ side }), className)} {...props}>
        {children}
        {showClose ? (
          <DialogPrimitive.Close asChild>
            <IconButton label={uiStrings.close} size="sm" className="absolute top-4 right-4">
              <X aria-hidden />
            </IconButton>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function SheetTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("mb-1 pr-7 font-display text-xl font-semibold", className)}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("mb-5 text-sm text-text-muted", className)}
      {...props}
    />
  );
}
