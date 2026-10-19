import { AnimatePresence, motion } from "framer-motion";
import { useLocation, useOutlet } from "react-router";
import { useReducedMotionPref } from "@/shared/ui";

const ease = [0.33, 0.9, 0.35, 1] as const;

/**
 * Route outlet with a 180 ms crossfade and an 8 px shift (only the fade with reduced motion).
 * Both pages are stacked while they cross, so the new one fades in as the old one fades out.
 */
export function ContentArea() {
  const location = useLocation();
  const outlet = useOutlet();
  const reduceMotion = useReducedMotionPref();
  const shift = reduceMotion ? 0 : 8;

  return (
    <main className="relative min-w-0 flex-1 overflow-hidden bg-bg">
      <AnimatePresence initial={false}>
        <motion.div
          key={location.pathname}
          className="absolute inset-0 overflow-auto"
          initial={{ opacity: 0, y: shift }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -shift, pointerEvents: "none" }}
          transition={{ duration: 0.18, ease }}
        >
          {outlet}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
