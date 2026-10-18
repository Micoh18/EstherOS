import { useRef } from "react";
import { motion } from "framer-motion";
import { Keyboard } from "lucide-react";
import { useEscapeClose } from "@/shared/hotkeys";
import { t } from "@/shared/i18n";

// TODO(A8): replace with ShortcutsSheet from @/shared/hotkeys.
export function ShortcutsPlaceholder({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEscapeClose(ref, onClose);

  return (
    <motion.div
      ref={ref}
      data-escape-close
      role="dialog"
      aria-modal="false"
      aria-labelledby="shortcuts-placeholder-title"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.33, 0.9, 0.35, 1] }}
      className="absolute right-6 bottom-6 z-50 w-80 rounded-lg border border-border bg-surface p-5 text-text shadow-(--shadow-lg)"
    >
      <h2
        id="shortcuts-placeholder-title"
        className="mb-2 flex items-center gap-2 font-display text-lg"
      >
        <Keyboard size={18} strokeWidth={1.75} className="text-accent" />
        {t("shell.shortcuts.title")}
      </h2>
      <p className="text-sm text-text-muted">{t("shell.shortcuts.placeholder")}</p>
    </motion.div>
  );
}
