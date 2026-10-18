import { Editor } from "@tiptap/react";
import { describe, expect, it } from "vitest";
import { createJournalExtensions } from "../editor/extensions";
import {
  computeStreak,
  contentToText,
  countWords,
  editorDocument,
  EMPTY_DOC_JSON,
  entryLabel,
  isEntryEmpty,
  type DocNode,
} from "../model";

const doc = (...content: DocNode[]): DocNode => ({ type: "doc", content });
const p = (...texts: string[]): DocNode => ({
  type: "paragraph",
  content: texts.map((text) => ({ type: "text", text })),
});

const RICH = doc(
  { type: "heading", content: [{ type: "text", text: "Un día bonito" }] },
  p("Hoy ", "llovió"),
  {
    type: "bulletList",
    content: [
      { type: "listItem", content: [p("té")] },
      { type: "listItem", content: [p("libro")] },
    ],
  },
  {
    type: "paragraph",
    content: [{ type: "text", text: "a" }, { type: "hardBreak" }, { type: "text", text: "b" }],
  },
  { type: "horizontalRule" },
  { type: "blockquote", content: [p("cita")] },
);

describe("contentToText", () => {
  it("joins blocks and keeps hard breaks", () => {
    expect(contentToText(doc(p("uno"), p("dos")))).toBe("uno\n\ndos");
    expect(contentToText(doc(p("uno"), p("dos")), "\n")).toBe("uno\ndos");
  });

  it("matches editor.getText() for every node of the journal schema", () => {
    const editor = new Editor({ extensions: createJournalExtensions(), content: RICH });
    expect(contentToText(RICH)).toBe(editor.getText());
    expect(contentToText(JSON.stringify(editor.getJSON()))).toBe(editor.getText());
    editor.destroy();
  });

  it("returns an empty string for empty or invalid documents", () => {
    expect(contentToText(doc({ type: "paragraph" }))).toBe("");
    expect(contentToText("{not json")).toBe("");
  });
});

describe("empty entries", () => {
  it("is empty without text, title or mood", () => {
    expect(isEntryEmpty({ title: null, contentText: "", mood: null })).toBe(true);
    expect(isEntryEmpty({ title: "  ", contentText: "\n\n  ", mood: null })).toBe(true);
  });

  it("is not empty with any of them", () => {
    expect(isEntryEmpty({ title: "Viaje", contentText: "", mood: null })).toBe(false);
    expect(isEntryEmpty({ title: null, contentText: "hola", mood: null })).toBe(false);
    expect(isEntryEmpty({ title: null, contentText: "", mood: "low" })).toBe(false);
  });

  it("treats a document with only empty blocks as empty", () => {
    const contentText = contentToText(
      doc(
        { type: "paragraph" },
        { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph" }] }] },
      ),
    );
    expect(isEntryEmpty({ title: null, contentText, mood: null })).toBe(true);
  });
});

describe("helpers", () => {
  it("counts words", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("  hola   mundo\n\nbonito ")).toBe(3);
  });

  it("labels an entry by title or first words", () => {
    expect(entryLabel({ title: "Título", contentText: "texto" })).toBe("Título");
    expect(entryLabel({ title: null, contentText: "uno\n\ndos" })).toBe("uno dos");
    expect(entryLabel({ title: null, contentText: "abcdefghij" }, 4)).toBe("abcd…");
  });

  it("computes the writing streak", () => {
    const today = "2026-10-18";
    expect(computeStreak([], today)).toEqual({ days: 0, writtenToday: false });
    expect(computeStreak(["2026-10-18", "2026-10-17", "2026-10-15"], today)).toEqual({
      days: 2,
      writtenToday: true,
    });
    // Yesterday's streak is still alive until today ends.
    expect(computeStreak(["2026-10-17", "2026-10-16"], today)).toEqual({
      days: 2,
      writtenToday: false,
    });
    expect(computeStreak(["2026-10-16"], today).days).toBe(0);
    // Across a month boundary.
    expect(computeStreak(["2026-10-01", "2026-09-30"], "2026-10-01").days).toBe(2);
  });
});

describe("editorDocument", () => {
  it("keeps the stored document when it has content", () => {
    const json = JSON.stringify(doc(p("hola")));
    expect(editorDocument({ contentJson: json, contentText: "hola" })).toBe(json);
  });

  it("rebuilds paragraphs from the text when the document is empty", () => {
    const rebuilt = editorDocument({ contentJson: EMPTY_DOC_JSON, contentText: "uno\n\ndos" });
    expect(contentToText(rebuilt)).toBe("uno\n\ndos");
  });

  it("keeps an empty document for an empty entry", () => {
    expect(editorDocument({ contentJson: EMPTY_DOC_JSON, contentText: "" })).toBe(EMPTY_DOC_JSON);
  });
});
