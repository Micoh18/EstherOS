import { memo } from "react";
import { ChevronLeft, ChevronRight, PanelRight, Plus } from "lucide-react";
import { useFormattedBinding } from "@/shared/hotkeys";
import { t } from "@/shared/i18n";
import { Button, IconButton, Tabs, TabsList, TabsTrigger, Tooltip } from "@/shared/ui";
import { CALENDAR_VIEWS, type CalendarView } from "../grid";

interface CalendarHeaderProps {
  title: string;
  view: CalendarView;
  panelOpen: boolean;
  /** The day view has its own fixed column, so the panel toggle is hidden there. */
  showPanelToggle: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (view: CalendarView) => void;
  onNewEvent: () => void;
  onTogglePanel: () => void;
}

const VIEW_ACTION = {
  month: "calendar.viewMonth",
  week: "calendar.viewWeek",
  day: "calendar.viewDay",
} as const;

export function CalendarHeader({
  title,
  view,
  panelOpen,
  showPanelToggle,
  onPrev,
  onNext,
  onToday,
  onViewChange,
  onNewEvent,
  onTogglePanel,
}: CalendarHeaderProps) {
  const prevKey = useFormattedBinding("calendar.prev");
  const nextKey = useFormattedBinding("calendar.next");
  const todayKey = useFormattedBinding("calendar.goToToday");
  const newKey = useFormattedBinding("calendar.newEvent");
  const panelKey = useFormattedBinding("calendar.togglePanel");
  return (
    <header className="flex flex-wrap items-center gap-3 px-5 pt-4 pb-3">
      <div className="flex items-center gap-1">
        <Tooltip content={t("calendar.prev")} shortcut={prevKey || undefined}>
          <IconButton label={t("calendar.prev")} size="sm" onClick={onPrev}>
            <ChevronLeft aria-hidden />
          </IconButton>
        </Tooltip>
        <Tooltip content={t("calendar.next")} shortcut={nextKey || undefined}>
          <IconButton label={t("calendar.next")} size="sm" onClick={onNext}>
            <ChevronRight aria-hidden />
          </IconButton>
        </Tooltip>
      </div>
      <h1
        aria-live="polite"
        className="min-w-[220px] font-display text-2xl font-semibold text-text"
      >
        {title}
      </h1>
      <Tooltip content={t("hotkeys.action.calendar.goToToday")} shortcut={todayKey || undefined}>
        <Button variant="soft" size="sm" onClick={onToday}>
          {t("calendar.today")}
        </Button>
      </Tooltip>

      <div className="ml-auto flex items-center gap-2">
        <ViewTabs view={view} onViewChange={onViewChange} />
        <Tooltip content={t("calendar.newEventLabel")} shortcut={newKey || undefined}>
          <Button size="sm" onClick={onNewEvent}>
            <Plus aria-hidden />
            {t("calendar.newEvent")}
          </Button>
        </Tooltip>
        {showPanelToggle ? (
          <Tooltip content={t("calendar.togglePanel")} shortcut={panelKey || undefined}>
            <IconButton
              label={t("calendar.togglePanel")}
              size="sm"
              aria-pressed={panelOpen}
              variant={panelOpen ? "soft" : "ghost"}
              onClick={onTogglePanel}
            >
              <PanelRight aria-hidden />
            </IconButton>
          </Tooltip>
        ) : null}
      </div>
    </header>
  );
}

/**
 * Memoized so the period title changing on every step does not re-render the tabs: their
 * sliding indicator is a framer layout animation, which measures the layout on each render.
 */
const ViewTabs = memo(function ViewTabs({
  view,
  onViewChange,
}: {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}) {
  const viewKeys = {
    month: useFormattedBinding(VIEW_ACTION.month),
    week: useFormattedBinding(VIEW_ACTION.week),
    day: useFormattedBinding(VIEW_ACTION.day),
  };
  return (
    <Tabs value={view} onValueChange={(next) => onViewChange(next as CalendarView)}>
      <TabsList aria-label={t("calendar.view.label")}>
        {CALENDAR_VIEWS.map((option) => (
          <Tooltip
            key={option}
            content={t(`hotkeys.action.${VIEW_ACTION[option]}`)}
            shortcut={viewKeys[option] || undefined}
          >
            <TabsTrigger value={option}>{t(`calendar.view.${option}`)}</TabsTrigger>
          </Tooltip>
        ))}
      </TabsList>
    </Tabs>
  );
});
