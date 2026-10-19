import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { Sparkle } from "@/shared/icons";
import { Button } from "./Button";
import { cn, focusRing } from "./cn";
import { uiStrings } from "./strings";
import { ToastContext, type ToastApi, type ToastOptions } from "./toastContext";

interface ToastItem extends ToastOptions {
  id: string;
  open: boolean;
}

/** Time to keep a closed toast mounted so its exit animation can finish. */
const EXIT_MS = 300;

const icons = {
  default: <Sparkle size={20} className="text-accent" />,
  success: <CircleCheck aria-hidden className="size-[20px] text-success" />,
  danger: <CircleAlert aria-hidden className="size-[20px] text-danger" />,
};

/** Toast queue + viewport (bottom right). Mount once near the app root. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((items) => items.map((item) => (item.id === id ? { ...item, open: false } : item)));
    window.setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== id));
    }, EXIT_MS);
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    counter.current += 1;
    const id = `toast-${counter.current}`;
    setToasts((items) => [...items, { ...options, id, open: true }]);
    return id;
  }, []);

  const api = useMemo<ToastApi>(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      <ToastPrimitive.Provider swipeDirection="right" label={uiStrings.notifications}>
        {children}
        {toasts.map((item) => (
          <ToastPrimitive.Root
            key={item.id}
            open={item.open}
            duration={item.duration ?? 4000}
            onOpenChange={(open) => {
              if (!open) dismiss(item.id);
            }}
            className={cn(
              "ui-toast relative flex items-start gap-3 rounded-lg border border-border bg-surface p-4 pr-11",
              "text-text shadow-(--shadow-lg)",
            )}
          >
            <span className="mt-px shrink-0">{icons[item.variant ?? "default"]}</span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <ToastPrimitive.Title className="font-semibold">{item.title}</ToastPrimitive.Title>
              {item.description ? (
                <ToastPrimitive.Description className="text-sm text-text-muted">
                  {item.description}
                </ToastPrimitive.Description>
              ) : null}
              {item.action ? (
                <ToastPrimitive.Action altText={item.action.label} asChild>
                  <Button
                    variant="soft"
                    size="sm"
                    className="mt-2 self-start"
                    onClick={item.action.onClick}
                  >
                    {item.action.label}
                  </Button>
                </ToastPrimitive.Action>
              ) : null}
            </div>
            <ToastPrimitive.Close
              aria-label={uiStrings.dismiss}
              className={cn(
                "absolute top-3 right-3 inline-flex size-[32px] items-center justify-center rounded-full",
                "text-text-muted hover:bg-surface-hover hover:text-text [&_svg]:size-4",
                focusRing,
              )}
            >
              <X aria-hidden />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed right-0 bottom-0 z-[100] flex w-[min(100vw,392px)] flex-col gap-2 p-4 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
