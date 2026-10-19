import { cva } from "class-variance-authority";
import { focusRing } from "./cn";

// cva definitions live apart from the components so Fast Refresh keeps working.

export const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap select-none",
    "transition-[background-color,color,box-shadow,scale] duration-(--dur-fast) ease-(--ease-soft)",
    "active:scale-[0.97] motion-reduce:active:scale-100",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:size-4 [&_svg]:shrink-0",
    focusRing,
  ],
  {
    variants: {
      variant: {
        primary: "bg-accent text-on-accent shadow-(--shadow-md) hover:bg-accent-hover",
        soft: "bg-accent-soft text-text hover:bg-[color-mix(in_srgb,var(--accent-soft),var(--accent)_18%)]",
        ghost: "bg-transparent text-text hover:bg-surface-hover",
        danger: "bg-danger/12 text-danger hover:bg-danger/20",
      },
      size: {
        sm: "h-[32px] px-3 text-sm",
        md: "h-[40px] px-4 text-base",
        lg: "h-[48px] px-5 text-md",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export const iconButtonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center rounded-full",
    "transition-[background-color,color,box-shadow,scale] duration-(--dur-fast) ease-(--ease-soft)",
    "active:scale-[0.94] motion-reduce:active:scale-100",
    "disabled:pointer-events-none disabled:opacity-50",
    focusRing,
  ],
  {
    variants: {
      variant: {
        ghost: "bg-transparent text-text-muted hover:bg-surface-hover hover:text-text",
        soft: "bg-accent-soft text-text hover:bg-[color-mix(in_srgb,var(--accent-soft),var(--accent)_18%)]",
      },
      size: {
        sm: "size-[32px] [&_svg]:size-4",
        md: "size-[40px] [&_svg]:size-[20px]",
      },
    },
    defaultVariants: { variant: "ghost", size: "md" },
  },
);

export const cardVariants = cva("rounded-lg border border-border text-text shadow-(--shadow-sm)", {
  variants: {
    tone: {
      surface: "bg-surface",
      elevated: "bg-bg-elevated",
    },
    variant: {
      default: "",
      interactive: [
        "cursor-pointer transition-[box-shadow,translate,background-color] duration-(--dur-fast) ease-(--ease-soft)",
        "hover:-translate-y-px hover:shadow-(--shadow-md) motion-reduce:hover:translate-y-0",
        "outline-none focus-visible:shadow-(--shadow-glow)",
      ],
    },
    padding: {
      none: "",
      sm: "p-3",
      md: "p-5",
      lg: "p-6",
    },
  },
  defaultVariants: { tone: "surface", variant: "default", padding: "md" },
});

/** Shared look of text fields (Input, Textarea, Select and the picker triggers). */
export const fieldVariants = cva(
  [
    "w-full rounded-md border border-border bg-surface text-text outline-none",
    "placeholder:text-text-faint",
    "transition-[border-color,box-shadow] duration-(--dur-fast) ease-(--ease-soft)",
    "hover:border-[color-mix(in_srgb,var(--border),var(--accent)_35%)]",
    "focus-visible:border-accent focus-visible:shadow-(--shadow-glow)",
    "aria-[invalid=true]:border-danger",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ],
  {
    variants: {
      size: {
        sm: "h-[32px] px-3 text-sm",
        md: "h-[40px] px-4 text-base",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export const chipVariants = cva(
  [
    "inline-flex max-w-full items-center gap-1.5 rounded-full font-semibold whitespace-nowrap text-text",
    "transition-[background-color,box-shadow] duration-(--dur-fast) ease-(--ease-soft)",
    "[&_svg]:size-[14px] [&_svg]:shrink-0",
  ],
  {
    variants: {
      color: {
        rose: "bg-palette-rose/30",
        lavender: "bg-palette-lavender/30",
        sage: "bg-palette-sage/30",
        butter: "bg-palette-butter/30",
        sky: "bg-palette-sky/30",
        peach: "bg-palette-peach/30",
        accent: "bg-accent-soft",
        neutral: "bg-bg-elevated text-text-muted",
      },
      size: {
        sm: "h-[22px] px-2 text-xs",
        md: "h-[28px] px-3 text-sm",
      },
      selected: {
        true: "shadow-[inset_0_0_0_1.5px_var(--accent)]",
        false: "",
      },
    },
    defaultVariants: { color: "neutral", size: "md", selected: false },
  },
);

export const skeletonVariants = cva("ui-skeleton block bg-bg-elevated", {
  variants: {
    shape: {
      text: "h-[14px] w-full rounded-full",
      circle: "size-[40px] rounded-full",
      block: "h-[96px] w-full rounded-lg",
    },
  },
  defaultVariants: { shape: "text" },
});

export const kbdKeyVariants = cva(
  [
    "inline-flex items-center justify-center rounded-full border border-border bg-bg-elevated",
    "font-mono leading-none text-text-muted shadow-[inset_0_-1px_0_var(--border)]",
  ],
  {
    variants: {
      size: {
        sm: "h-[18px] min-w-[18px] px-1.5 text-[11px]",
        md: "h-[22px] min-w-[22px] px-2 text-xs",
      },
    },
    defaultVariants: { size: "md" },
  },
);
