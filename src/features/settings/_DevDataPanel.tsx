// Temporary data-layer panel. TODO(A8): delete when the real backup UI lands.
import { useEffect, useState } from "react";
import { createEvent, listEventsInRange } from "@/features/calendar";
import { createEntry, listEntriesForMonth } from "@/features/journal";
import { createTask, listLists, listTasks, toggleDone } from "@/features/todo";
import {
  dbSizeBytes,
  ensureTag,
  exportDb,
  importDb,
  onDbChanged,
  openDataFolder,
  pickExportPath,
  pickImportPath,
  setTagsFor,
} from "@/shared/db";
import { addDaysISO, monthRange, todayISO, toYearMonth } from "@/shared/lib/dates";
import { getAllSettings, setSetting } from "./repository";

// TODO(A2): move to i18n (`settings.dev.*`) if the panel survives; A8 removes it.
const STRINGS = {
  title: "Datos (panel temporal)",
  sampleTodo: "Crear tareas de ejemplo",
  sampleEvents: "Crear eventos de ejemplo",
  sampleJournal: "Crear entrada de ejemplo",
  toggleTheme: "Alternar theme guardado",
  export: "Exportar BD…",
  import: "Importar BD…",
  openFolder: "Abrir carpeta de datos",
  exported: (path: string) => `Exportado en ${path}`,
  imported: (backup: string) => `Importado. Copia previa en ${backup}`,
  cancelled: "Cancelado",
  error: (message: string) => `Error: ${message}`,
  stats: "Resumen",
};

interface Stats {
  lists: number;
  tasks: number;
  events: number;
  entries: number;
  theme: string;
  sizeBytes: number | null;
}

async function loadStats(): Promise<Stats> {
  const today = todayISO();
  const month = monthRange(new Date());
  const [lists, tasks, events, entries, settings, sizeBytes] = await Promise.all([
    listLists({ includeArchived: true }),
    listTasks({ includeArchived: true }),
    listEventsInRange(month.from, month.to, { today }),
    listEntriesForMonth(toYearMonth(new Date())),
    getAllSettings(),
    dbSizeBytes().catch(() => null),
  ]);
  return {
    lists: lists.length,
    tasks: tasks.length,
    events: events.length,
    entries: entries.length,
    theme: settings.theme,
    sizeBytes,
  };
}

async function seedTodo() {
  const today = todayISO();
  const parent = await createTask({ title: "Preparar picnic", dueDate: today, priority: "high" });
  await createTask({ title: "Comprar fresas", parentId: parent.id });
  await createTask({ title: "Lavar la manta", parentId: parent.id });
  const done = await createTask({ title: "Regar las plantas", dueDate: addDaysISO(today, -1) });
  await toggleDone(done.id);
  await createTask({ title: "Llamar a mamá", dueDate: addDaysISO(today, 2), dueTime: "18:00" });
}

async function seedEvents() {
  const today = todayISO();
  const yoga = await createEvent({
    title: "Yoga",
    date: today,
    recurrence: "weekly",
    color: "lavender",
  });
  await setTagsFor("event", yoga.id, [(await ensureTag("bienestar")).id]);
  await createEvent({
    title: "Café con Ana",
    allDay: false,
    startAt: `${addDaysISO(today, 1)}T10:00:00`,
    endAt: `${addDaysISO(today, 1)}T11:30:00`,
    color: "peach",
  });
  await createEvent({ title: "Paseo por el parque", date: addDaysISO(today, -3), color: "sage" });
}

async function seedJournal() {
  const text = "Hoy fue un día tranquilo. Tomé té y leí un rato junto a la ventana.";
  await createEntry({
    date: todayISO(),
    title: "Un día suave",
    mood: "good",
    contentText: text,
    contentJson: JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text }] }],
    }),
  });
}

export function DevDataPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const refresh = () => {
      loadStats()
        .then(setStats)
        .catch((error: unknown) => setMessage(STRINGS.error(String(error))));
    };
    refresh();
    return onDbChanged("*", refresh);
  }, []);

  const run = (action: () => Promise<string | void>) => async () => {
    try {
      const result = await action();
      if (result) setMessage(result);
    } catch (error) {
      setMessage(STRINGS.error(error instanceof Error ? error.message : String(error)));
    }
  };

  const buttons: [string, () => Promise<string | void>][] = [
    [STRINGS.sampleTodo, seedTodo],
    [STRINGS.sampleEvents, seedEvents],
    [STRINGS.sampleJournal, seedJournal],
    [
      STRINGS.toggleTheme,
      async () => {
        const { theme } = await getAllSettings();
        await setSetting("theme", theme === "pink" ? "dark" : "pink");
      },
    ],
    [
      STRINGS.export,
      async () => {
        const path = await pickExportPath();
        if (!path) return STRINGS.cancelled;
        await exportDb(path);
        return STRINGS.exported(path);
      },
    ],
    [
      STRINGS.import,
      async () => {
        const path = await pickImportPath();
        if (!path) return STRINGS.cancelled;
        const result = await importDb(path);
        return STRINGS.imported(result.backupPath);
      },
    ],
    [STRINGS.openFolder, openDataFolder],
  ];

  return (
    <section className="m-6 flex max-w-xl flex-col gap-4 rounded-lg border border-border bg-surface p-6 text-text">
      <h2 className="font-display text-2xl">{STRINGS.title}</h2>
      <div className="flex flex-wrap gap-2">
        {buttons.map(([label, action]) => (
          <button
            key={label}
            type="button"
            onClick={run(action)}
            className="rounded-md bg-accent-soft px-3 py-2 text-sm hover:bg-surface-hover"
          >
            {label}
          </button>
        ))}
      </div>
      {stats && (
        <pre className="rounded-md bg-bg p-3 text-xs text-text-muted">
          {STRINGS.stats}: {JSON.stringify(stats, null, 2)}
        </pre>
      )}
      {message && <p className="text-sm text-text-muted">{message}</p>}
    </section>
  );
}
