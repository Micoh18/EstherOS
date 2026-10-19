import { createContext, useContext, useId, useState, type ComponentProps } from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion } from "framer-motion";
import { cn, focusRing } from "./cn";
import { useReducedMotionPref } from "./motion";

type TabsSize = "sm" | "md";

interface TabsContextValue {
  value: string | undefined;
  indicatorId: string;
  size: TabsSize;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps extends ComponentProps<typeof TabsPrimitive.Root> {
  size?: TabsSize;
}

/** Segmented tabs with a sliding indicator. Works controlled (`value`) or uncontrolled. */
export function Tabs({
  value,
  defaultValue,
  onValueChange,
  size = "md",
  className,
  ...props
}: TabsProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const current = value ?? uncontrolled;
  const indicatorId = useId();

  const handleChange = (next: string) => {
    if (value === undefined) setUncontrolled(next);
    onValueChange?.(next);
  };

  return (
    <TabsContext.Provider value={{ value: current, indicatorId, size }}>
      <TabsPrimitive.Root
        value={current}
        onValueChange={handleChange}
        className={cn("flex flex-col gap-4", className)}
        {...props}
      />
    </TabsContext.Provider>
  );
}

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) throw new Error("Tabs components must be used inside <Tabs>.");
  return context;
}

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full border border-border bg-bg-elevated p-1",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  value,
  className,
  children,
  ...props
}: ComponentProps<typeof TabsPrimitive.Trigger>) {
  const { value: active, indicatorId, size } = useTabsContext();
  const reduceMotion = useReducedMotionPref();
  const isActive = active === value;

  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        "relative isolate inline-flex items-center justify-center gap-1.5 rounded-full font-semibold whitespace-nowrap",
        "text-text-muted transition-colors duration-(--dur-fast) hover:text-text data-[state=active]:text-text",
        "disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
        size === "md" ? "h-[32px] px-4 text-sm" : "h-[26px] px-3 text-xs",
        focusRing,
        className,
      )}
      {...props}
    >
      {isActive ? (
        <motion.span
          layoutId={indicatorId}
          aria-hidden
          className="absolute inset-0 -z-10 rounded-full bg-surface shadow-(--shadow-sm)"
          transition={
            reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.33, 0.9, 0.35, 1] }
          }
        />
      ) : null}
      {children}
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("outline-none", className)} {...props} />;
}
