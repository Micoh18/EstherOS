/* eslint-disable no-console -- this module is the single sanctioned console wrapper. */

type LogArgs = unknown[];

const isProd = import.meta.env.PROD;

/** How many recent errors are kept for "Copiar detalle" on the error screen. */
const RECENT_LIMIT = 20;

export interface LoggedError {
  /** ISO timestamp. */
  at: string;
  message: string;
}

const recent: LoggedError[] = [];

function describe(value: unknown): string {
  if (value instanceof Error) return value.stack ?? `${value.name}: ${value.message}`;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function remember(args: LogArgs) {
  recent.push({ at: new Date().toISOString(), message: args.map(describe).join(" ") });
  if (recent.length > RECENT_LIMIT) recent.shift();
}

/** App logger: silent in production except for errors. */
export const log = {
  debug: (...args: LogArgs) => {
    if (!isProd) console.debug("[estheros]", ...args);
  },
  info: (...args: LogArgs) => {
    if (!isProd) console.info("[estheros]", ...args);
  },
  warn: (...args: LogArgs) => {
    if (!isProd) console.warn("[estheros]", ...args);
  },
  error: (...args: LogArgs) => {
    remember(args);
    console.error("[estheros]", ...args);
  },
};

/** Last errors logged in this session, oldest first. */
export function recentErrors(): readonly LoggedError[] {
  return [...recent];
}

/**
 * Sends errors nobody caught (thrown in handlers, rejected promises without `catch`) through
 * `log.error`, so they show up in the error detail instead of only in the devtools console.
 * Returns the cleanup.
 */
export function captureUnhandledErrors(target: Window = window): () => void {
  const onError = (event: ErrorEvent) => log.error("unhandled error", event.error ?? event.message);
  const onRejection = (event: PromiseRejectionEvent) =>
    log.error("unhandled rejection", event.reason);
  target.addEventListener("error", onError);
  target.addEventListener("unhandledrejection", onRejection);
  return () => {
    target.removeEventListener("error", onError);
    target.removeEventListener("unhandledrejection", onRejection);
  };
}
