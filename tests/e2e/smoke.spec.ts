import Database from "better-sqlite3";
import { addDays, format } from "date-fns";
import type { Page } from "@playwright/test";
import { test, expect } from "./support/fixtures";
import type { FakeBackend } from "./support/backend";

const iso = (date: Date) => format(date, "yyyy-MM-dd");

/** Starts past the welcome dialog, as a returning user would. */
async function openApp(page: Page, backend: FakeBackend, path = "/") {
  backend.setSettings({ onboarding_done: true, user_name: "Ana" });
  await page.goto(path);
  await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
}

async function goTo(page: Page, section: "Hoy" | "Calendario" | "Diario" | "Tareas" | "Ajustes") {
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("link", { name: section })
    .click();
}

async function settingsSection(page: Page, name: "Apariencia" | "Datos" | "Atajos") {
  await page
    .getByRole("navigation", { name: "Secciones de ajustes" })
    .getByRole("button", { name })
    .click();
  await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
}

async function openInbox(page: Page) {
  await page
    .getByRole("navigation", { name: "Listas y vistas de tareas" })
    .getByRole("button", { name: /^Inbox/ })
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "Inbox" })).toBeVisible();
}

test("onboarding: name and theme are saved and the welcome does not come back", async ({
  page,
  backend,
}) => {
  await page.goto("/");
  const welcome = page.getByRole("dialog", { name: "Te doy la bienvenida a Estheros ♡" });
  await expect(welcome).toBeVisible();

  await welcome.getByLabel("¿Cómo quieres que te llame?").fill("Ana");
  await welcome.getByRole("button", { name: "Siguiente" }).click();

  const themeStep = page.getByRole("dialog", { name: "Elige tu tema" });
  await themeStep.getByRole("radio", { name: "White" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "white");
  await themeStep.getByRole("button", { name: "Siguiente" }).click();

  const done = page.getByRole("dialog", { name: "Listo, Ana ♡" });
  await done.getByRole("button", { name: "Empezar" }).click();
  await expect(done).toBeHidden();

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ana ♡");
  await expect.poll(() => backend.setting("onboarding_done")).toBe(true);
  expect(backend.setting("user_name")).toBe("Ana");
  expect(backend.setting("theme")).toBe("white");

  // Restarting keeps the theme and skips the welcome.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ana ♡");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "white");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("to-do: quick capture with !alta @mañana, then complete it", async ({ page, backend }) => {
  await openApp(page, backend, "/todo");
  await openInbox(page);

  const capture = page.getByRole("textbox", { name: "Nueva tarea" });
  await capture.fill("Comprar flores !alta @mañana");
  await capture.press("Enter");

  const checkbox = page.getByRole("checkbox", { name: "Marcar «Comprar flores» como hecha" });
  await expect(checkbox).toBeVisible();
  await expect
    .poll(() => backend.db.prepare("SELECT title, priority, due_date, status FROM task").all())
    .toEqual([
      {
        title: "Comprar flores",
        priority: "high",
        due_date: iso(addDays(new Date(), 1)),
        status: "open",
      },
    ]);

  // While the capture has focus it shows a syntax hint below it; blurring hides the hint and the
  // rows move up, so a click that blurs the capture would land under the checkbox. Leave the field
  // first, as a person reading the new row does.
  await capture.blur();
  await expect(page.getByText("!alta · !media · !baja · @hoy · @mañana")).toBeHidden();
  await checkbox.click();
  await expect(page.getByRole("checkbox", { name: "Reabrir «Comprar flores»" })).toBeChecked();
  // The row stays checked for its animation, then moves to «Completadas».
  await expect(page.getByRole("button", { name: /Completadas \(1\)/ })).toBeVisible();
  await expect.poll(() => backend.db.prepare("SELECT status FROM task").pluck().get()).toBe("done");

  // After a restart the task is still done.
  await page.reload();
  await openInbox(page);
  await expect(page.getByRole("button", { name: /Completadas \(1\)/ })).toBeVisible();
});

test("calendar: a weekly event shows up three weeks later", async ({ page, backend }) => {
  await openApp(page, backend, "/calendar");

  await page.getByRole("button", { name: "Evento", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Nuevo evento" });
  await dialog.getByLabel("Título").fill("Clase de cerámica");
  await dialog.getByRole("combobox", { name: "Repetir" }).click();
  await page.getByRole("option", { name: "Cada semana" }).click();
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(dialog).toBeHidden();

  await expect
    .poll(() => backend.db.prepare("SELECT recurrence FROM event").pluck().all())
    .toEqual(["weekly"]);

  await page.getByRole("tab", { name: "Semana" }).click();
  const next = page.getByRole("button", { name: "Período siguiente" });
  const event = page.getByRole("main").getByText("Clase de cerámica");
  await expect(event.first()).toBeVisible();
  for (let week = 1; week <= 3; week++) {
    await next.click();
    await expect(event.first()).toBeVisible();
  }
});

test("journal: write an entry and find it with the search", async ({ page, backend }) => {
  await openApp(page, backend, "/journal");

  const editor = page.getByRole("textbox", { name: "Texto de la entrada" });
  await editor.click();
  await page.keyboard.type("Hoy vi un colibrí en el balcón.");
  await expect(page.getByText("Guardado ✓")).toBeVisible();
  await expect
    .poll(() => backend.db.prepare("SELECT content_text FROM journal_entry").pluck().all())
    .toEqual(["Hoy vi un colibrí en el balcón."]);

  await page.getByRole("searchbox", { name: "Buscar en el diario" }).fill("colibrí");
  const results = page.getByRole("region", { name: "Resultados" });
  await expect(results.getByText("1 entrada")).toBeVisible();
  await expect(results.getByText(/colibrí/)).toBeVisible();
});

test("theme: switching in Ajustes repaints the window and is saved", async ({ page, backend }) => {
  await openApp(page, backend, "/settings");

  await page.getByRole("radiogroup", { name: "Tema" }).getByRole("radio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect.poll(() => backend.setting("theme")).toBe("dark");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("shortcuts: reassign «Ir a Tareas» and use the new combination", async ({ page, backend }) => {
  await openApp(page, backend, "/settings");
  await settingsSection(page, "Atajos");

  await page.getByRole("button", { name: "Cambiar el atajo de «Ir a Tareas»" }).click();
  const recorder = page.getByLabel("Nuevo atajo para «Ir a Tareas»");
  await expect(recorder).toBeFocused();
  await page.keyboard.press("Alt+T");
  await page.keyboard.press("Enter");
  await expect(recorder).toBeHidden();

  await expect.poll(() => backend.setting("keybindings")).toMatchObject({ "nav.todo": "Alt+T" });

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect(page).toHaveURL(/\/settings$/);
  await page.keyboard.press("Alt+T");
  await expect(page).toHaveURL(/\/todo/);
});

test("backup: export writes a SQLite copy with the user's data", async ({ page, backend }) => {
  await openApp(page, backend, "/todo?view=all");
  const capture = page.getByRole("textbox", { name: "Nueva tarea" });
  await capture.fill("Regar las plantas");
  await capture.press("Enter");
  await expect(page.getByRole("checkbox", { name: /Regar las plantas/ })).toBeVisible();

  await goTo(page, "Ajustes");
  await settingsSection(page, "Datos");
  const target = backend.file("estheros-backup.db");
  backend.nextSavePath = target;
  await page.getByRole("button", { name: "Exportar copia de seguridad…" }).click();
  await expect(page.getByText(`Copia guardada en ${target}`)).toBeVisible();

  const copy = new Database(target, { readonly: true });
  try {
    expect(copy.prepare("SELECT title FROM task").pluck().all()).toEqual(["Regar las plantas"]);
    expect(
      copy.prepare("SELECT value_json FROM setting WHERE key = 'user_name'").pluck().get(),
    ).toBe('"Ana"');
  } finally {
    copy.close();
  }
  expect(backend.calls.some((call) => call.cmd === "plugin:dialog|save")).toBe(true);
});
