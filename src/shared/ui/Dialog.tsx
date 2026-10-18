import type { ComponentProps } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "./cn";
import { IconButton } from "./IconButton";
import { uiStrings } from "./strings";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/** Tinted, blurred backdrop shared by Dialog and Sheet. */
export const overlayClass = "ui-overlay fixed inset-0 z-50 bg-shadow-weak backdrop-blur-[8px]";

const dialogContentVariants = cva(
  [
    "ui-pop fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
    "max-h-[calc(100vh-64px)] overflow-y-auto",
    "rounded-xl border border-border bg-surface p-6 text-text shadow-(--shadow-lg) outline-none",
  ],
  {
    variants: {
      size: {
        sm: "w-[min(92vw,400px)]",
        md: "w-[min(92vw,520px)]",
        lg: "w-[min(92vw,720px)]",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface DialogContentProps
  extends
    ComponentProps<typeof DialogPrimitive.Content>,
    VariantProps<typeof dialogContentVariants> {
  /** Shows the round close button in the top right corner. Defaults to true. */
  showClose?: boolean;
}

export function DialogContent({
  size,
  showClose = true,
  className,
  children,
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlayClass} />
      <DialogPrimitive.Content
        className={cn(dialogContentVariants({ size }), className)}
        {...props}
      >
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

export function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mb-5 flex flex-col gap-1 pr-7", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mt-6 flex flex-wrap justify-end gap-2", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("font-display text-xl font-semibold", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description className={cn("text-sm text-text-muted", className)} {...props} />
  );
}
