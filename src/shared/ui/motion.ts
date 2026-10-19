import { useContext, useEffect, useState } from "react";
import { MotionConfigContext } from "framer-motion";

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

function systemQuery(): MediaQueryList | null {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(REDUCE_QUERY)
    : null;
}

/** Windows "Show animations" turned off, followed live (framer only reads it once). */
export function useSystemReducedMotion(): boolean {
  const [reduce, setReduce] = useState(() => systemQuery()?.matches ?? false);
  useEffect(() => {
    const query = systemQuery();
    if (!query) return;
    const update = () => setReduce(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduce;
}

/**
 * Whether to drop particles and displacements and keep only fades: the system setting or the
 * app's "Reducir animaciones" toggle. The toggle reaches shared code through the
 * `<MotionConfig reducedMotion="always">` that Settings mounts at the root (framer's own
 * `useReducedMotion()` ignores it and only reads the system once).
 */
export function useReducedMotionPref(): boolean {
  const { reducedMotion } = useContext(MotionConfigContext);
  const system = useSystemReducedMotion();
  if (reducedMotion === "always") return true;
  if (reducedMotion === "never") return false;
  return system;
}
