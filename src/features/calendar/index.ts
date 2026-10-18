// Public API of the calendar feature.
export * from "./model";
export * from "./repository";

export { EventChip, type EventChipProps } from "./components/EventChip";
export { MiniCalendar, type MiniCalendarProps } from "./components/MiniCalendar";
export { useEventsForDate, useEventsInRange, type QueryState } from "./hooks";
