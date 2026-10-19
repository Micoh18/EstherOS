import { create } from "zustand";
import { FONT_SCALES, type FontScale } from "./model";
import { bindSetting } from "./persistence";
import "./reduceMotion.css";

/** localStorage copies read before the first render; the `setting` table stays the source. */
const FONT_SCALE_KEY = "estheros.fontScale";
const REDUCE_MOTION_KEY = "estheros.reduceMotion";

/** Class on <html> while "Reducir animaciones" is on (see reduceMotion.css). */
export const REDUCE_MOTION_CLASS = "reduce-motion";

interface AppearanceState {
  fontScale: FontScale;
  reduceMotion: boolean;
}

function readCache(): AppearanceState {
  try {
    const scale = Number(globalThis.localStorage?.getItem(FONT_SCALE_KEY));
    return {
      fontScale: FONT_SCALES.find((value) => value === scale) ?? 1,
      reduceMotion: globalThis.localStorage?.getItem(REDUCE_MOTION_KEY) === "true",
    };
  } catch {
    return { fontScale: 1, reduceMotion: false };
  }
}

function writeCache({ fontScale, reduceMotion }: AppearanceState) {
  try {
    globalThis.localStorage?.setItem(FONT_SCALE_KEY, String(fontScale));
    globalThis.localStorage?.setItem(REDUCE_MOTION_KEY, String(reduceMotion));
  } catch {
    // Not cached: the database value applies a moment later on the next start.
  }
}

/** Type scale is in rem, so scaling the root font size scales all text (spacing is px). */
function applyToDocument({ fontScale, reduceMotion }: AppearanceState) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.fontSize = fontScale === 1 ? "" : `${fontScale * 100}%`;
  root.classList.toggle(REDUCE_MOTION_CLASS, reduceMotion);
}

export const useAppearanceStore = create<AppearanceState>(() => readCache());

// Applied at import time, before React renders, so there is no flash of the default size.
applyToDocument(useAppearanceStore.getState());
useAppearanceStore.subscribe((state) => {
  applyToDocument(state);
  writeCache(state);
});

export function setFontScale(fontScale: FontScale) {
  useAppearanceStore.setState({ fontScale });
}

export function setReduceMotion(reduceMotion: boolean) {
  useAppearanceStore.setState({ reduceMotion });
}

/** Keeps the store in sync with `font_scale` and `reduce_motion`. Returns the cleanup. */
export function bindAppearanceSettings(): () => void {
  const offScale = bindSetting("font_scale", {
    read: () => useAppearanceStore.getState().fontScale,
    apply: setFontScale,
    subscribe: (onChange) =>
      useAppearanceStore.subscribe((state, prev) => {
        if (state.fontScale !== prev.fontScale) onChange(state.fontScale);
      }),
  });
  const offMotion = bindSetting("reduce_motion", {
    read: () => useAppearanceStore.getState().reduceMotion,
    apply: setReduceMotion,
    subscribe: (onChange) =>
      useAppearanceStore.subscribe((state, prev) => {
        if (state.reduceMotion !== prev.reduceMotion) onChange(state.reduceMotion);
      }),
  });
  return () => {
    offScale();
    offMotion();
  };
}
