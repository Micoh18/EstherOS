/* eslint-disable no-console -- command line script: its output is the report. */
/**
 * Fills an Estheros database with generated data to measure performance (500 tasks, a couple
 * of years of events, months of journal entries). Every seeded row id starts with `seed-`, so
 * `--clean` removes them all without touching anything else.
 *
 *   node scripts/seed.ts --db <path/to/estheros.db> [--tasks 500] [--done 0.2] [--events 240]
 *                        [--entries 150]
 *   node scripts/seed.ts --db <path/to/estheros.db> --clean
 *
 * Run it with the app closed, on a database the app already created (migrations applied).
 * It refuses the real data folder (`com.estheros.desktop`) unless `--allow-real-db` is given.
 */
import { existsSync } from "node:fs";
import { parseArgs } from "node:util";
import Database from "better-sqlite3";

const { values } = parseArgs({
  options: {
    db: { type: "string" },
    tasks: { type: "string", default: "500" },
    /** Share of tasks seeded as done (0 keeps all 500 visible in "Todas"). */
    done: { type: "string", default: "0.2" },
    events: { type: "string", default: "240" },
    entries: { type: "string", default: "150" },
    clean: { type: "boolean", default: false },
    "allow-real-db": { type: "boolean", default: false },
  },
});

const dbPath = values.db;
if (!dbPath || !existsSync(dbPath)) {
  console.error("Usage: node scripts/seed.ts --db <existing estheros.db> [--clean]");
  process.exit(1);
}
if (/com\.estheros\.desktop/i.test(dbPath) && !values["allow-real-db"]) {
  console.error(
    "Refusing to seed the real database (com.estheros.desktop). Use a test identifier.",
  );
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

const PREFIX = "seed-";
const TABLES = ["task_tag", "event_tag", "journal_tag", "task", "event", "journal_entry"];

function clean() {
  db.transaction(() => {
    db.prepare(`DELETE FROM task_tag WHERE task_id LIKE '${PREFIX}%'`).run();
    db.prepare(`DELETE FROM event_tag WHERE event_id LIKE '${PREFIX}%'`).run();
    db.prepare(`DELETE FROM journal_tag WHERE entry_id LIKE '${PREFIX}%'`).run();
    for (const table of ["task", "event", "journal_entry", "todo_list", "tag"]) {
      db.prepare(`DELETE FROM ${table} WHERE id LIKE '${PREFIX}%'`).run();
    }
  })();
}

if (values.clean) {
  clean();
  console.log(`Removed seeded rows from ${TABLES.join(", ")}, todo_list and tag.`);
  process.exit(0);
}

// Deterministic pseudo-random numbers, so two runs produce the same data.
let state = 20261019;
function random(): number {
  state = (state * 1103515245 + 12345) % 2147483648;
  return state / 2147483648;
}
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
const int = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));

const pad = (n: number) => String(n).padStart(2, "0");
function localDate(offsetDays: number): string {
  const day = new Date();
  day.setHours(12, 0, 0, 0);
  day.setDate(day.getDate() + offsetDays);
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
}
const nowUTC = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

const COLORS = ["rose", "lavender", "sage", "butter", "sky", "peach"] as const;
const PRIORITIES = ["none", "none", "low", "medium", "high"] as const;
const MOODS = ["great", "good", "okay", "low", "bad"] as const;
const VERBS = ["Comprar", "Llamar a", "Revisar", "Ordenar", "Escribir a", "Preparar", "Regar"];
const THINGS = [
  "flores",
  "la abuela",
  "el presupuesto",
  "el armario",
  "Lucía",
  "la cena",
  "las plantas",
];
const EVENTS = ["Yoga", "Café con Ana", "Dentista", "Cumpleaños", "Cine", "Clase de cerámica"];

clean();

const insertList = db.prepare(
  `INSERT INTO todo_list (id, name, color, icon, sort_order, is_archived, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
);
const insertTask = db.prepare(
  `INSERT INTO task (id, list_id, parent_id, title, notes, due_date, due_time, priority, status,
                     sort_order, completed_at, created_at, updated_at)
   VALUES (?, ?, NULL, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
);
const insertEvent = db.prepare(
  `INSERT INTO event (id, title, description, all_day, date, start_at, end_at, tz, color,
                      recurrence, recurrence_until, location, is_past_log, created_at, updated_at)
   VALUES (?, ?, NULL, ?, ?, ?, ?, NULL, ?, ?, NULL, NULL, ?, ?, ?)`,
);
const insertEntry = db.prepare(
  `INSERT INTO journal_entry (id, date, title, content_json, content_text, mood, is_favorite,
                              created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);

const taskCount = Number(values.tasks);
const doneRatio = Number(values.done);
const eventCount = Number(values.events);
const entryCount = Number(values.entries);

db.transaction(() => {
  const lists = ["Casa", "Trabajo", "Yo"].map((name, index) => {
    const id = `${PREFIX}list-${index}`;
    insertList.run(id, `${name} (seed)`, COLORS[index], "list", 100 + index, nowUTC, nowUTC);
    return id;
  });
  const listIds = ["inbox", ...lists];

  for (let i = 0; i < taskCount; i++) {
    const hasDate = random() < 0.7;
    const due = hasDate ? localDate(int(-30, 60)) : null;
    const time = due && random() < 0.25 ? `${pad(int(7, 20))}:${pick(["00", "30"])}` : null;
    const done = random() < doneRatio;
    insertTask.run(
      `${PREFIX}task-${i}`,
      pick(listIds),
      `${pick(VERBS)} ${pick(THINGS)} #${i + 1}`,
      due,
      time,
      pick(PRIORITIES),
      done ? "done" : "open",
      1000 + i,
      done ? nowUTC : null,
      nowUTC,
      nowUTC,
    );
  }

  for (let i = 0; i < eventCount; i++) {
    const day = localDate(int(-365, 365));
    const allDay = random() < 0.35;
    const hour = int(7, 20);
    const recurrence = random() < 0.05 ? "weekly" : "none";
    insertEvent.run(
      `${PREFIX}event-${i}`,
      pick(EVENTS),
      allDay ? 1 : 0,
      allDay ? day : null,
      allDay ? null : `${day}T${pad(hour)}:00:00`,
      allDay ? null : `${day}T${pad(hour + 1)}:00:00`,
      pick(COLORS),
      recurrence,
      day < localDate(0) ? 1 : 0,
      nowUTC,
      nowUTC,
    );
  }

  for (let i = 0; i < entryCount; i++) {
    const day = localDate(-int(0, 180));
    const text = `Hoy fue un día tranquilo. Nota de prueba número ${i + 1}.`;
    const json = JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text }] }],
    });
    insertEntry.run(
      `${PREFIX}entry-${i}`,
      day,
      random() < 0.3 ? `Entrada ${i + 1}` : null,
      json,
      text,
      random() < 0.8 ? pick(MOODS) : null,
      random() < 0.1 ? 1 : 0,
      `${day}T20:00:00Z`,
      `${day}T20:00:00Z`,
    );
  }
})();

console.log(
  `Seeded ${taskCount} tasks, ${eventCount} events and ${entryCount} journal entries into ${dbPath}.`,
);
