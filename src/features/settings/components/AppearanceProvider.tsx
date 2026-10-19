import { useEffect, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { bindAppearanceSettings, useAppearanceStore } from "../appearance";

/**
 * Applies font size and "Reducir animaciones" to the whole app and keeps them in sync with the
 * settings table. Mount once near the root.
 */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const reduceMotion = useAppearanceStore((state) => state.reduceMotion);
  useEffect(() => bindAppearanceSettings(), []);
  return <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>{children}</MotionConfig>;
}
