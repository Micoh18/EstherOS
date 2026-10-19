import { useState, type ComponentProps } from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Sparkle } from "@/shared/icons";
import { cn, focusRing } from "./cn";
import { useReducedMotionPref } from "./motion";

type ParticleShape = "heart" | "sparkle";

export interface CheckboxProps extends Omit<
  ComponentProps<typeof CheckboxPrimitive.Root>,
  "checked" | "defaultChecked" | "onCheckedChange" | "children"
> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  size?: "sm" | "md";
  /** Particle burst when checking. "auto" picks hearts in the pink theme, sparkles otherwise. */
  particles?: ParticleShape | "auto" | false;
}

const PARTICLE_COUNT = 4;
const PARTICLE_ANGLES = Array.from(
  { length: PARTICLE_COUNT },
  (_, i) => -90 + (360 / PARTICLE_COUNT) * i + 20,
);

function resolveShape(particles: ParticleShape | "auto"): ParticleShape {
  if (particles !== "auto") return particles;
  return document.documentElement.dataset.theme === "dark" ||
    document.documentElement.dataset.theme === "white"
    ? "sparkle"
    : "heart";
}

/** Round checkbox that draws its check and releases a few particles when checked. */
export function Checkbox({
  checked,
  defaultChecked = false,
  onCheckedChange,
  size = "md",
  particles = "auto",
  className,
  disabled,
  ...props
}: CheckboxProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultChecked);
  const [burst, setBurst] = useState<{ id: number; shape: ParticleShape } | null>(null);
  const reduceMotion = useReducedMotionPref();
  const isChecked = checked ?? uncontrolled;
  const box = size === "md" ? 24 : 18;

  const handleChange = (next: CheckboxPrimitive.CheckedState) => {
    const value = next === true;
    if (checked === undefined) setUncontrolled(value);
    if (value && particles !== false && !reduceMotion) {
      setBurst({ id: Date.now(), shape: resolveShape(particles) });
    }
    onCheckedChange?.(value);
  };

  return (
    <CheckboxPrimitive.Root
      checked={isChecked}
      onCheckedChange={handleChange}
      disabled={disabled}
      className={cn(
        "group relative inline-flex shrink-0 items-center justify-center rounded-full border-2",
        "transition-[background-color,border-color,box-shadow] duration-(--dur-fast) ease-(--ease-soft)",
        // Larger invisible hit area (32px minimum target).
        "before:absolute before:-inset-1.5 before:rounded-full before:content-['']",
        "disabled:cursor-not-allowed disabled:opacity-50",
        isChecked
          ? "border-accent bg-accent text-on-accent"
          : "border-text-faint bg-surface hover:border-accent hover:bg-accent-soft",
        focusRing,
        className,
      )}
      style={{ width: box, height: box }}
      {...props}
    >
      <svg viewBox="0 0 24 24" className="size-full" aria-hidden focusable={false}>
        <motion.path
          d="M6.5 12.5l3.6 3.6 7.4-7.6"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={
            reduceMotion
              ? { opacity: isChecked ? 1 : 0, pathLength: 1 }
              : { opacity: isChecked ? 1 : 0, pathLength: isChecked ? 1 : 0 }
          }
          transition={{
            pathLength: { duration: 0.24, ease: [0.33, 0.9, 0.35, 1] },
            opacity: { duration: isChecked ? 0.05 : 0.14 },
          }}
        />
      </svg>
      <AnimatePresence>
        {burst ? (
          <span
            key={burst.id}
            aria-hidden
            className="pointer-events-none absolute inset-0 text-accent"
          >
            {PARTICLE_ANGLES.map((angle, index) => {
              const radians = (angle * Math.PI) / 180;
              const distance = box * 0.95;
              return (
                <motion.span
                  key={angle}
                  className="absolute top-1/2 left-1/2 -mt-[5px] -ml-[5px]"
                  initial={{ x: 0, y: 0, scale: 0.4, opacity: 0 }}
                  animate={{
                    x: Math.cos(radians) * distance,
                    y: Math.sin(radians) * distance,
                    scale: [0.4, 1, 0.8],
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{
                    duration: 0.5,
                    ease: "easeOut",
                    delay: 0.06 + index * 0.02,
                    opacity: { duration: 0.5, times: [0, 0.15, 0.6, 1] },
                  }}
                  onAnimationComplete={
                    index === PARTICLE_COUNT - 1 ? () => setBurst(null) : undefined
                  }
                >
                  {burst.shape === "heart" ? (
                    <Heart size={10} filled strokeWidth={2} />
                  ) : (
                    <Sparkle size={10} strokeWidth={2} />
                  )}
                </motion.span>
              );
            })}
          </span>
        ) : null}
      </AnimatePresence>
    </CheckboxPrimitive.Root>
  );
}
