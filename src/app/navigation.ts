import { BookHeart, CalendarDays, ListTodo, Settings, Sun, type LucideIcon } from "lucide-react";
import type { ActionId, Scope } from "@/shared/hotkeys";
import type { I18nKey } from "@/shared/i18n";

export interface NavItem {
  path: string;
  labelKey: I18nKey;
  icon: LucideIcon;
  actionId: ActionId;
  scope?: Scope;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { path: "/today", labelKey: "nav.today", icon: Sun, actionId: "nav.today", scope: "today" },
  {
    path: "/calendar",
    labelKey: "nav.calendar",
    icon: CalendarDays,
    actionId: "nav.calendar",
    scope: "calendar",
  },
  {
    path: "/journal",
    labelKey: "nav.journal",
    icon: BookHeart,
    actionId: "nav.journal",
    scope: "journal",
  },
  { path: "/todo", labelKey: "nav.todo", icon: ListTodo, actionId: "nav.todo", scope: "todo" },
  { path: "/settings", labelKey: "nav.settings", icon: Settings, actionId: "nav.settings" },
];

export const HOME_PATH = "/today";
export const SETTINGS_PATH = "/settings";
