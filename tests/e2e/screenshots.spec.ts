import { join } from "node:path";
import { addDays, format } from "date-fns";
import type { Page } from "@playwright/test";
import { test, expect } from "./support/fixtures";
import type { FakeBackend } from "./support/backend";

// README screenshots with tidy sample data. Not part of the smoke run:
// `SCREENSHOTS=1 npx playwright test` writes them to assets/screenshots/.

const OUT = join(process.cwd(), "assets", "screenshots");
const NOW = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const day = (offset: number) => format(addDays(new Date(), offset), "yyyy-MM-dd");

function seed(backend: FakeBackend, theme: string) {
  backend.setSettings({ onboarding_done: true, user_name: "Ana", theme });
  const db = backend.db;
  const list = db.prepare(
    `INSERT INTO todo_list (id, name, color, icon, sort_order, is_archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
  );
  list.run("casa", "Casa", "sage", "home", 1, NOW, NOW);
  list.run("yo", "Yo", "rose", "heart", 2, NOW, NOW);

  const task = db.prepare(
    `INSERT INTO task (id, list_id, parent_id, title, notes, due_date, due_time, priority, status,
                       sort_order, completed_at, created_at, updated_at)
     VALUES (?, ?, NULL, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const tasks: [string, string, number | null, string | null, string, "open" | "done"][] = [
    ["Comprar flores para la mesa", "casa", 0, null, "high", "open"],
    ["Llamar a mamá", "yo", 0, "19:00", "medium", "open"],
    ["Regar las plantas", "casa", 0, null, "none", "done"],
    ["Devolver el libro a la biblioteca", "yo", -1, null, "low", "open"],
    ["Preparar la maleta del finde", "yo", 2, null, "none", "open"],
    ["Cambiar las sábanas", "casa", 3, null, "none", "open"],
    ["Pedir cita con la dermatóloga", "inbox", null, null, "medium", "open"],
  ];
  tasks.forEach(([title, listId, offset, time, priority, status], index) =>
    task.run(
      `shot-task-${index}`,
      listId,
      title,
      offset === null ? null : day(offset),
      time,
      priority,
      status,
      index,
      status === "done" ? NOW : null,
      NOW,
      NOW,
    ),
  );

  const event = db.prepare(
    `INSERT INTO event (id, title, description, all_day, date, start_at, end_at, tz, color,
                        recurrence, recurrence_until, location, is_past_log, created_at, updated_at)
     VALUES (?, ?, NULL, ?, ?, ?, ?, NULL, ?, ?, NULL, NULL, ?, ?, ?)`,
  );
  const timed = (
    id: string,
    title: string,
    offset: number,
    from: string,
    to: string,
    color: string,
    recurrence = "none",
  ) =>
    event.run(
      id,
      title,
      0,
      // Timed events keep their day in `date` too, as the repository writes them.
      day(offset),
      `${day(offset)}T${from}:00`,
      `${day(offset)}T${to}:00`,
      color,
      recurrence,
      0,
      NOW,
      NOW,
    );
  timed("shot-yoga", "Yoga", -14, "08:00", "09:00", "lavender", "weekly");
  timed("shot-cafe", "Café con Sofi", 0, "17:30", "18:30", "peach");
  timed("shot-dentist", "Dentista", 4, "10:00", "11:00", "sky");
  timed("shot-ceramics", "Clase de cerámica", -9, "18:00", "20:00", "sage", "weekly");
  event.run("shot-bday", "Cumpleaños de Lucía", 1, day(6), null, null, "rose", "none", 0, NOW, NOW);
  event.run(
    "shot-trip",
    "Escapada a la playa",
    1,
    day(-6),
    null,
    null,
    "butter",
    "none",
    1,
    NOW,
    NOW,
  );

  const entry = db.prepare(
    `INSERT INTO journal_entry (id, date, title, content_json, content_text, mood, is_favorite,
                                created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const entries: [number, string, string, string, number][] = [
    [
      0,
      "Una mañana suave",
      "Desayuné sin prisa y salí a caminar antes del trabajo. Las flores del balcón por fin abrieron.",
      "great",
      1,
    ],
    [-1, "Lluvia", "Tarde de lluvia, té de canela y un capítulo del libro nuevo.", "good", 0],
    [-3, "", "Día largo, pero la cena con Sofi lo arregló todo.", "okay", 0],
    [-6, "La playa", "El mar estaba frío y precioso. Quiero volver pronto.", "great", 1],
    [-10, "", "Me costó concentrarme. Mañana empiezo con lo más fácil.", "low", 0],
  ];
  entries.forEach(([offset, title, text, mood, favorite], index) =>
    entry.run(
      `shot-entry-${index}`,
      day(offset),
      title || null,
      JSON.stringify({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text }] }],
      }),
      text,
      mood,
      favorite,
      NOW,
      NOW,
    ),
  );
}

async function capture(page: Page, name: string) {
  // Let the entrance fades and the theme transition finish before the picture.
  await page.waitForTimeout(1200);
  await page.mouse.move(0, 0);
  await page.screenshot({ path: join(OUT, `${name}.png`) });
}

const SHOTS: { name: string; theme: string; path: string; ready: (page: Page) => Promise<void> }[] =
  [
    {
      name: "today-pink",
      theme: "pink",
      path: "/today",
      ready: (page) => expect(page.getByText("Café con Sofi").first()).toBeVisible(),
    },
    {
      name: "calendar-dark",
      theme: "dark",
      path: "/calendar",
      ready: (page) => expect(page.getByText("Dentista").first()).toBeVisible(),
    },
    {
      name: "journal-white",
      theme: "white",
      path: "/journal",
      ready: (page) => expect(page.getByText("Una mañana suave").first()).toBeVisible(),
    },
    {
      name: "todo-pink",
      theme: "pink",
      path: "/todo",
      ready: (page) => expect(page.getByText("Llamar a mamá").first()).toBeVisible(),
    },
    {
      name: "settings-white",
      theme: "white",
      path: "/settings",
      ready: (page) => expect(page.getByRole("radiogroup", { name: "Tema" })).toBeVisible(),
    },
  ];

for (const shot of SHOTS) {
  test(`${shot.name} @screenshots`, async ({ page, backend }) => {
    seed(backend, shot.theme);
    await page.goto(shot.path);
    await shot.ready(page);
    await capture(page, shot.name);
  });
}
