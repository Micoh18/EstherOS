import { useCallback, useEffect, useState } from "react";
import { EditorContent, useEditor, type Editor, type JSONContent } from "@tiptap/react";
import { useScope } from "@/shared/hotkeys";
import { t } from "@/shared/i18n";
import { log } from "@/shared/lib/log";
import { EMPTY_DOC_JSON } from "../model";
import { createEditorBridge } from "../editor/extensions";
import { EditorBubbleMenu } from "./EditorBubbleMenu";
import "../editor.css";

export interface JournalEditorProps {
  /** Tiptap document as JSON text. Read once, when the editor mounts. */
  initialContent: string;
  placeholder: string;
  autoFocus?: boolean;
  onChange: (contentJson: string, contentText: string) => void;
  /** `Escape` inside the editor. */
  onEscape?: () => void;
  onReady?: (editor: Editor) => void;
}

function parseDoc(json: string): JSONContent {
  try {
    return JSON.parse(json) as JSONContent;
  } catch (error) {
    log.warn("invalid journal document, starting blank", error);
    return JSON.parse(EMPTY_DOC_JSON) as JSONContent;
  }
}

/** Opens the link field for the selection (or the link under the cursor). */
function requestLink(editor: Editor | null, open: () => void) {
  if (!editor) return;
  if (editor.state.selection.empty && editor.isActive("link")) {
    editor.chain().extendMarkRange("link").run();
  }
  if (!editor.state.selection.empty) open();
}

/** Rich text editor of an entry: Tiptap with the journal schema and a bubble menu. */
export function JournalEditor({
  initialContent,
  placeholder,
  autoFocus = false,
  onChange,
  onEscape,
  onReady,
}: JournalEditorProps) {
  const [bridge] = useState(() => createEditorBridge({ placeholder, onChange, onEscape }));
  const [linkOpen, setLinkOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  // While the cursor is in the editor its shortcuts win (Ctrl+B is bold, not the sidebar).
  useScope("editor", focused);

  const editor = useEditor({
    extensions: bridge.extensions,
    content: parseDoc(initialContent),
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: {
        class: "journal-editor__content",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": t("journal.entry.editorLabel"),
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor: current }) =>
      bridge.emitChange(JSON.stringify(current.getJSON()), current.getText()),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  });

  const openLink = useCallback(() => setLinkOpen(true), []);
  useEffect(() => {
    bridge.update({
      placeholder,
      onChange,
      onEscape,
      onLinkRequest: () => requestLink(editor, openLink),
    });
  }, [bridge, editor, placeholder, onChange, onEscape, openLink]);

  useEffect(() => {
    if (editor) onReady?.(editor);
  }, [editor, onReady]);

  return (
    <div className="journal-editor">
      {editor ? (
        <EditorBubbleMenu editor={editor} linkOpen={linkOpen} onLinkOpenChange={setLinkOpen} />
      ) : null}
      <EditorContent editor={editor} />
    </div>
  );
}
