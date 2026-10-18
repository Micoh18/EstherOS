import { createContext, useContext, type ReactNode } from "react";

export type ToastVariant = "default" | "success" | "danger";

export interface ToastOptions {
  title: ReactNode;
  description?: ReactNode;
  variant?: ToastVariant;
  /** Milliseconds before auto-dismiss. Defaults to 4000; Infinity keeps it open. */
  duration?: number;
  /** Single inline action, e.g. "Deshacer". */
  action?: { label: string; onClick: () => void };
}

export interface ToastApi {
  /** Shows a toast and returns its id. */
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

/** Access the toast queue. Requires <ToastProvider> above in the tree. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <ToastProvider>.");
  return api;
}
