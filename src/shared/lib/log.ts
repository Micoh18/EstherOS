/* eslint-disable no-console -- this module is the single sanctioned console wrapper. */

type LogArgs = unknown[];

const isProd = import.meta.env.PROD;

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
    console.error("[estheros]", ...args);
  },
};
