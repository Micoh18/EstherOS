import { Extension, textblockTypeInputRule, type AnyExtension } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import StarterKit from "@tiptap/starter-kit";

export interface JournalEditorHooks {
  /** Placeholder shown while the document is empty. */
  placeholder?: () => string;
  /** `Escape`: leave the editor (back to the title field). */
  onEscape?: () => void;
  /** `Ctrl+K`: edit the link of the selection. */
  onLinkRequest?: () => void;
}

/** `# ` becomes a level 2 heading: the journal has no h1 (the date is the page title). */
const HashHeading = Extension.create({
  name: "journalHashHeading",
  addInputRules() {
    const heading = this.editor.schema.nodes.heading;
    return heading
      ? [textblockTypeInputRule({ find: /^#\s$/, type: heading, getAttributes: { level: 2 } })]
      : [];
  },
});

/**
 * Journal schema: paragraphs, h2/h3, bold, italic, underline, strike, lists (bullet, ordered,
 * decorative tasks), quote, divider and link. No code: this is a diary, not a document editor.
 */
export function createJournalExtensions(hooks: JournalEditorHooks = {}): AnyExtension[] {
  const shortcuts = Extension.create({
    name: "journalShortcuts",
    addKeyboardShortcuts() {
      return {
        Escape: () => {
          if (!hooks.onEscape) return false;
          hooks.onEscape();
          return true;
        },
        "Mod-k": () => {
          if (!hooks.onLinkRequest) return false;
          hooks.onLinkRequest();
          return true;
        },
      };
    },
  });

  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      code: false,
      codeBlock: false,
      link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({ placeholder: () => hooks.placeholder?.() ?? "" }),
    HashHeading,
    shortcuts,
  ];
}
