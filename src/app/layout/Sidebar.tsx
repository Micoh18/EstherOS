import { NavLink } from "react-router";
import { motion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useFormattedBinding } from "@/shared/hotkeys";
import { t } from "@/shared/i18n";
import { IconButton, Tooltip } from "@/shared/ui";
import { NAV_ITEMS, type NavItem } from "../navigation";
import { useSidebarStore } from "./sidebarStore";

const indicatorTransition = { type: "spring", stiffness: 420, damping: 36 } as const;

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const binding = useFormattedBinding(item.actionId);
  const label = t(item.labelKey);
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      aria-label={collapsed ? label : undefined}
      title={binding ? `${label} · ${binding}` : label}
      className={({ isActive }) =>
        `relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors duration-(--dur-fast) focus-visible:shadow-(--shadow-glow) focus-visible:outline-none ${
          isActive ? "text-text" : "text-text-muted hover:bg-surface-hover hover:text-text"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="sidebar-active-indicator"
              transition={indicatorTransition}
              className="absolute inset-0 rounded-md bg-accent-soft"
            />
          )}
          <Icon size={18} strokeWidth={1.75} className="relative shrink-0" />
          {!collapsed && <span className="relative truncate">{label}</span>}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const collapsed = useSidebarStore((state) => state.collapsed);
  const toggle = useSidebarStore((state) => state.toggle);
  const toggleBinding = useFormattedBinding("app.toggleSidebar");
  const toggleLabel = collapsed ? t("shell.sidebar.expand") : t("shell.sidebar.collapse");

  return (
    <nav
      aria-label={t("shell.sidebar.label")}
      className={`flex shrink-0 flex-col gap-1 border-r border-border bg-bg-elevated p-3 transition-[width] duration-(--dur-base) ease-(--ease-soft) ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      {NAV_ITEMS.map((item) => (
        <SidebarLink key={item.path} item={item} collapsed={collapsed} />
      ))}
      <div className="flex-1" />
      <Tooltip content={toggleLabel} shortcut={toggleBinding || undefined} side="right">
        <IconButton
          label={toggleLabel}
          size="sm"
          aria-expanded={!collapsed}
          onClick={toggle}
          className="ml-1"
        >
          {collapsed ? <PanelLeftOpen strokeWidth={1.75} /> : <PanelLeftClose strokeWidth={1.75} />}
        </IconButton>
      </Tooltip>
    </nav>
  );
}
