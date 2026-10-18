import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { formatBinding } from "@/shared/hotkeys";
import { t } from "@/shared/i18n";
import { Plus } from "@/shared/icons";
import { IconButton, Kbd, cn } from "@/shared/ui";
import { Copy, Ellipsis } from "./icons";

const itemClass = cn(
  "flex h-[34px] cursor-pointer items-center gap-2 rounded-sm px-3 text-sm text-text outline-none select-none",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-hover [&_svg]:size-4",
);

interface EntryMenuProps {
  onNewEntry: () => void;
  onDuplicate: () => void;
  canDuplicate: boolean;
}

export function EntryMenu({ onNewEntry, onDuplicate, canDuplicate }: EntryMenuProps) {
  const newEntryShortcut = formatBinding("journal.newEntry");
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <IconButton label={t("journal.menu.label")} size="sm">
          <Ellipsis aria-hidden />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="ui-pop z-50 min-w-[220px] rounded-md border border-border bg-surface p-1 shadow-(--shadow-md)"
        >
          <DropdownMenu.Item className={itemClass} onSelect={onNewEntry}>
            <Plus aria-hidden />
            <span className="flex-1">{t("journal.menu.newEntry")}</span>
            {newEntryShortcut ? <Kbd combo={newEntryShortcut} size="sm" /> : null}
          </DropdownMenu.Item>
          <DropdownMenu.Item className={itemClass} onSelect={onDuplicate} disabled={!canDuplicate}>
            <Copy aria-hidden />
            <span className="flex-1">{t("journal.menu.duplicate")}</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
