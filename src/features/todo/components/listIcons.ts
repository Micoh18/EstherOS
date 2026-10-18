import {
  BookOpen,
  Briefcase,
  Coffee,
  Flower2,
  Heart,
  House,
  Inbox,
  Leaf,
  List,
  ShoppingCart,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";
import type { ColorKey } from "@/shared/db";
import type { I18nKey } from "@/shared/i18n";

/** Icons a list can use. The key is what `todo_list.icon` stores. */
export const LIST_ICONS = {
  inbox: { icon: Inbox, label: "todo.icon.inbox" },
  heart: { icon: Heart, label: "todo.icon.heart" },
  home: { icon: House, label: "todo.icon.home" },
  work: { icon: Briefcase, label: "todo.icon.work" },
  star: { icon: Star, label: "todo.icon.star" },
  book: { icon: BookOpen, label: "todo.icon.book" },
  flower: { icon: Flower2, label: "todo.icon.flower" },
  coffee: { icon: Coffee, label: "todo.icon.coffee" },
  cart: { icon: ShoppingCart, label: "todo.icon.cart" },
  sparkles: { icon: Sparkles, label: "todo.icon.sparkles" },
  leaf: { icon: Leaf, label: "todo.icon.leaf" },
  list: { icon: List, label: "todo.icon.list" },
} satisfies Record<string, { icon: LucideIcon; label: I18nKey }>;

export type ListIconKey = keyof typeof LIST_ICONS;
export const LIST_ICON_KEYS = Object.keys(LIST_ICONS) as ListIconKey[];

/** Static class names per palette color (Tailwind needs them spelled out). */
export const PALETTE_TEXT_CLASS: Record<ColorKey, string> = {
  rose: "text-palette-rose",
  lavender: "text-palette-lavender",
  sage: "text-palette-sage",
  butter: "text-palette-butter",
  sky: "text-palette-sky",
  peach: "text-palette-peach",
};

export const PALETTE_BG_CLASS: Record<ColorKey, string> = {
  rose: "bg-palette-rose",
  lavender: "bg-palette-lavender",
  sage: "bg-palette-sage",
  butter: "bg-palette-butter",
  sky: "bg-palette-sky",
  peach: "bg-palette-peach",
};
