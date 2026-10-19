import { useState, type ComponentType, type KeyboardEvent } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { formatBinding, type ActionId } from "@/shared/hotkeys";
import { t, type I18nKey } from "@/shared/i18n";
import { Check } from "@/shared/icons";
import { Tooltip, cn } from "@/shared/ui";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Strikethrough,
  Underline,
  Unlink,
} from "./icons";

interface FormatButton {
  id: string;
  icon: ComponentType<{ "aria-hidden"?: boolean }>;
  action: ActionId;
  isActive: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
}

const BUTTONS: FormatButton[] = [
  {
    id: "bold",
    icon: Bold,
    action: "editor.bold",
    isActive: (e) => e.isActive("bold"),
    run: (e) => e.chain().focus().toggleBold().run(),
  },
  {
    id: "italic",
    icon: Italic,
    action: "editor.italic",
    isActive: (e) => e.isActive("italic"),
    run: (e) => e.chain().focus().toggleItalic().run(),
  },
  {
    id: "underline",
    icon: Underline,
    action: "editor.underline",
    isActive: (e) => e.isActive("underline"),
    run: (e) => e.chain().focus().toggleUnderline().run(),
  },
  {
    id: "strike",
    icon: Strikethrough,
    action: "editor.strike",
    isActive: (e) => e.isActive("strike"),
    run: (e) => e.chain().focus().toggleStrike().run(),
  },
  {
    id: "h2",
    icon: Heading2,
    action: "editor.heading2",
    isActive: (e) => e.isActive("heading", { level: 2 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: "h3",
    icon: Heading3,
    action: "editor.heading3",
    isActive: (e) => e.isActive("heading", { level: 3 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: "bullet",
    icon: List,
    action: "editor.bulletList",
    isActive: (e) => e.isActive("bulletList"),
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    id: "ordered",
    icon: ListOrdered,
    action: "editor.orderedList",
    isActive: (e) => e.isActive("orderedList"),
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "task",
    icon: ListTodo,
    action: "editor.taskList",
    isActive: (e) => e.isActive("taskList"),
    run: (e) => e.chain().focus().toggleTaskList().run(),
  },
  {
    id: "quote",
    icon: Quote,
    action: "editor.blockquote",
    isActive: (e) => e.isActive("blockquote"),
    run: (e) => e.chain().focus().toggleBlockquote().run(),
  },
];

const buttonClass = (active: boolean) =>
  cn(
    "inline-flex size-[32px] items-center justify-center rounded-full outline-none [&_svg]:size-4",
    "transition-colors duration-(--dur-fast) ease-(--ease-soft) focus-visible:shadow-(--shadow-glow)",
    active ? "bg-accent-soft text-text" : "text-text-muted hover:bg-surface-hover hover:text-text",
  );

interface EditorBubbleMenuProps {
  editor: Editor;
  linkOpen: boolean;
  onLinkOpenChange: (open: boolean) => void;
}

/** Floating format bar shown over a text selection. No fixed toolbar: the page stays calm. */
export function EditorBubbleMenu({ editor, linkOpen, onLinkOpenChange }: EditorBubbleMenuProps) {
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      ...Object.fromEntries(BUTTONS.map((button) => [button.id, button.isActive(e)])),
      link: e.isActive("link"),
      href: (e.getAttributes("link").href as string | undefined) ?? "",
    }),
  }) as Record<string, boolean> & { link: boolean; href: string };

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top", offset: 8, onHide: () => onLinkOpenChange(false) }}
      className={cn(
        "z-40 flex items-center gap-0.5 rounded-full border border-border bg-surface p-1",
        "shadow-(--shadow-md)",
      )}
    >
      {linkOpen ? (
        <LinkForm
          key={active.href}
          editor={editor}
          initialHref={active.href}
          onDone={() => onLinkOpenChange(false)}
        />
      ) : (
        <div
          role="toolbar"
          aria-label={t("journal.format.label")}
          className="flex items-center gap-0.5"
        >
          {BUTTONS.map((button) => {
            const Icon = button.icon;
            return (
              <Tooltip
                key={button.id}
                content={t(`hotkeys.action.${button.action}` as I18nKey)}
                shortcut={formatBinding(button.action) || undefined}
                side="top"
              >
                <button
                  type="button"
                  aria-label={t(`hotkeys.action.${button.action}` as I18nKey)}
                  aria-pressed={active[button.id]}
                  onClick={() => button.run(editor)}
                  className={buttonClass(active[button.id])}
                >
                  <Icon aria-hidden />
                </button>
              </Tooltip>
            );
          })}
          <span aria-hidden className="mx-0.5 h-[18px] w-px bg-border" />
          <Tooltip
            content={t("hotkeys.action.editor.link")}
            shortcut={formatBinding("editor.link") || undefined}
            side="top"
          >
            <button
              type="button"
              aria-label={t("hotkeys.action.editor.link")}
              aria-pressed={active.link}
              onClick={() => onLinkOpenChange(true)}
              className={buttonClass(active.link)}
            >
              <Link aria-hidden />
            </button>
          </Tooltip>
        </div>
      )}
    </BubbleMenu>
  );
}

function LinkForm({
  editor,
  initialHref,
  onDone,
}: {
  editor: Editor;
  initialHref: string;
  onDone: () => void;
}) {
  const [href, setHref] = useState(initialHref);

  const apply = () => {
    const value = href.trim();
    const chain = editor.chain().focus().extendMarkRange("link");
    if (value) chain.setLink({ href: value }).run();
    else chain.unsetLink().run();
    onDone();
  };

  const remove = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    onDone();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      apply();
    } else if (event.key === "Escape") {
      // Handled here so the global Escape does not close anything else.
      event.preventDefault();
      onDone();
      editor.commands.focus();
    }
  };

  return (
    <div className="flex items-center gap-1 pl-2">
      <input
        // Only shown after an explicit request (button or Ctrl+K), so taking focus is expected.
        autoFocus
        type="url"
        value={href}
        onChange={(event) => setHref(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t("journal.link.placeholder")}
        aria-label={t("journal.link.placeholder")}
        className="h-[32px] w-[220px] rounded-md bg-transparent px-1 text-sm text-text outline-none placeholder:text-text-faint focus-visible:shadow-(--shadow-glow)"
      />
      <button
        type="button"
        aria-label={t("journal.link.apply")}
        onClick={apply}
        className={buttonClass(false)}
      >
        <Check aria-hidden />
      </button>
      {initialHref ? (
        <button
          type="button"
          aria-label={t("journal.link.remove")}
          onClick={remove}
          className={buttonClass(false)}
        >
          <Unlink aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
