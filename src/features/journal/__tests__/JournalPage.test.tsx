import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { Editor } from "@tiptap/react";
import { MemoryRouter } from "react-router";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { todayISO } from "@/shared/lib/dates";
import { ToastProvider } from "@/shared/ui";
import { useMemoryDb, type MemoryDb } from "./memoryDb";
import { JournalPage } from "../components/JournalPage";
import { createEntry, datesWithEntriesInMonth } from "../repository";

let db: MemoryDb;
const rows = () =>
  db.raw.prepare("SELECT id, title, content_json FROM journal_entry").all() as {
    id: string;
    title: string | null;
    content_json: string;
  }[];

function renderPage(path = "/journal") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <JournalPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

const editorElement = () =>
  screen.findByRole("textbox", { name: "Texto de la entrada" }, { timeout: 5000 });
const editorOf = (element: HTMLElement) => (element as HTMLElement & { editor: Editor }).editor;

const FORMATTED = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Título" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "muy " },
        { type: "text", marks: [{ type: "bold" }], text: "bonito" },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "té" }] }],
        },
      ],
    },
  ],
};

// jsdom has no layout: ProseMirror asks for rects when it scrolls the selection into view.
beforeAll(() => {
  const noRects = () => [] as unknown as DOMRectList;
  Range.prototype.getClientRects ??= noRects;
  Range.prototype.getBoundingClientRect ??= () => new DOMRect();
  Element.prototype.getClientRects ??= noRects;
});

beforeEach(() => {
  db = useMemoryDb();
});

describe("JournalPage", () => {
  it("opens today's blank entry ready to write without creating rows", async () => {
    renderPage();
    const editor = await editorElement();
    expect(editor).toBeInTheDocument();
    expect(screen.getByText("Este mes aún está en blanco ✨")).toBeInTheDocument();
    await act(() => new Promise((resolve) => setTimeout(resolve, 1000)));
    expect(rows()).toHaveLength(0);
  });

  it("saves once the user writes and keeps the formatting when reopened", async () => {
    const view = renderPage();
    const element = await editorElement();
    act(() => {
      editorOf(element).commands.setContent(FORMATTED, { emitUpdate: true });
    });
    await waitFor(() => expect(rows()).toHaveLength(1), { timeout: 3000 });
    await waitFor(() => expect(screen.getByText("Guardado ✓")).toBeInTheDocument(), {
      timeout: 3000,
    });
    view.unmount();

    renderPage();
    const reopened = await editorElement();
    await waitFor(() => expect(within(reopened).getByText("bonito").tagName).toBe("STRONG"));
    expect(within(reopened).getByText("Título").tagName).toBe("H2");
    expect(within(reopened).getByText("té").closest("ul")).not.toBeNull();
    expect(rows()).toHaveLength(1);
  });

  it("deletes an entry after the inline confirmation and updates list and calendar dots", async () => {
    await createEntry({ date: todayISO(), contentText: "Un día tranquilo", mood: "good" });
    renderPage();
    await screen.findByDisplayValue("", { exact: true }, { timeout: 5000 });
    await screen.findByRole("button", { name: /Un día tranquilo/ });

    fireEvent.click(screen.getByRole("button", { name: "Eliminar entrada" }));
    expect(screen.getByText("¿Eliminar?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sí" }));

    await waitFor(() => expect(rows()).toHaveLength(0));
    await screen.findByText("Este mes aún está en blanco ✨");
    expect(await datesWithEntriesInMonth(todayISO().slice(0, 7))).toEqual([]);
  });

  it("opens the day of a ?date= link", async () => {
    await createEntry({ date: "2026-09-14", contentText: "Paseo por el río" });
    renderPage("/journal?date=2026-09-14");
    const editor = await editorElement();
    await waitFor(() => expect(within(editor).getByText("Paseo por el río")).toBeInTheDocument());
  });

  it("filters favorites and highlights search matches", async () => {
    await createEntry({
      date: "2026-08-03",
      contentText: "Un atardecer precioso",
      isFavorite: true,
    });
    await createEntry({ date: "2026-09-14", contentText: "Otro atardecer en la playa" });
    await createEntry({ date: "2026-10-01", contentText: "Nada que ver" });
    renderPage();
    await editorElement();

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "atardecer" } });
    await screen.findByText("2 entradas", undefined, { timeout: 3000 });
    expect(screen.getAllByText("atardecer").every((el) => el.tagName === "MARK")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Solo favoritas" }));
    await screen.findByText("1 entrada");

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "xyz" } });
    await screen.findByText("No encontré nada con «xyz»", undefined, { timeout: 3000 });
  });
});
