import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookHeart, CalendarDays, ListTodo, Settings, Sun, type LucideIcon } from "lucide-react";
import { useTheme } from "@/shared/theme";
import { ThemePicker } from "@/features/settings";
import { formatBinding, useScope } from "@/shared/hotkeys";
import { Bow } from "@/shared/icons";
import { t, type I18nKey } from "@/shared/i18n";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  Input,
  useReducedMotionPref,
} from "@/shared/ui";

const TOUR: readonly { icon: LucideIcon; label: I18nKey; text: I18nKey }[] = [
  { icon: Sun, label: "nav.today", text: "onboarding.tour.today" },
  { icon: CalendarDays, label: "nav.calendar", text: "onboarding.tour.calendar" },
  { icon: BookHeart, label: "nav.journal", text: "onboarding.tour.journal" },
  { icon: ListTodo, label: "nav.todo", text: "onboarding.tour.todo" },
  { icon: Settings, label: "nav.settings", text: "onboarding.tour.settings" },
];

const STEPS = 3;
const EASE_SOFT = [0.33, 0.9, 0.35, 1] as const;

export interface OnboardingDialogProps {
  initialName?: string;
  /** Called with the chosen name when finishing or skipping. */
  onFinish: (name: string) => void;
}

/** First-run dialog in three steps: name → theme → "Listo ♡" with a short sidebar tour. */
export function OnboardingDialog({ initialName = "", onFinish }: OnboardingDialogProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName);
  const shift = useReducedMotionPref() ? 0 : 12;
  const { theme, setTheme } = useTheme();
  useScope("dialog");

  const finish = () => onFinish(name.trim());
  const title =
    step === 0
      ? t("onboarding.name.title")
      : step === 1
        ? t("onboarding.theme.title")
        : name.trim()
          ? t("onboarding.done.titleNamed", { name: name.trim() })
          : t("onboarding.done.title");

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) finish();
      }}
    >
      <DialogContent
        size={step === 1 ? "lg" : "md"}
        showClose={false}
        aria-label={t("onboarding.label")}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-text-muted">
            {t("onboarding.step", { current: step + 1, total: STEPS })}
          </span>
          <div className="flex gap-1" aria-hidden>
            {Array.from({ length: STEPS }, (_, index) => (
              <span
                key={index}
                className={
                  index <= step
                    ? "h-[6px] w-[22px] rounded-full bg-accent"
                    : "h-[6px] w-[22px] rounded-full bg-bg-elevated"
                }
              />
            ))}
          </div>
        </div>

        <DialogTitle className="flex items-center gap-2">
          {step === 0 ? <Bow size={24} className="text-accent" /> : null}
          {title}
        </DialogTitle>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: shift }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -shift }}
            transition={{ duration: 0.18, ease: EASE_SOFT }}
            className="mt-4"
          >
            {step === 0 ? (
              <form
                className="flex flex-col gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  setStep(1);
                }}
              >
                <label htmlFor="onboarding-name" className="font-semibold">
                  {t("onboarding.name.label")}
                </label>
                <Input
                  id="onboarding-name"
                  autoFocus
                  maxLength={60}
                  value={name}
                  placeholder={t("onboarding.name.placeholder")}
                  onChange={(event) => setName(event.target.value)}
                />
                <DialogDescription>{t("onboarding.name.hint")}</DialogDescription>
              </form>
            ) : step === 1 ? (
              <div className="flex flex-col gap-3">
                <DialogDescription>
                  {t("onboarding.theme.hint", { shortcut: formatBinding("theme.cycle") })}
                </DialogDescription>
                <ThemePicker value={theme} onChange={setTheme} />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <DialogDescription>{t("onboarding.done.intro")}</DialogDescription>
                <ul className="flex flex-col gap-2">
                  {TOUR.map(({ icon: Icon, label, text }) => (
                    <li
                      key={label}
                      className="flex items-center gap-3 rounded-md bg-bg-elevated px-3 py-2"
                    >
                      <Icon
                        size={18}
                        strokeWidth={1.75}
                        className="shrink-0 text-accent"
                        aria-hidden
                      />
                      <span className="font-semibold">{t(label)}</span>
                      <span className="text-sm text-text-muted">{t(text)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <DialogFooter className="justify-between">
          <Button variant="ghost" onClick={finish}>
            {t("onboarding.skip")}
          </Button>
          <div className="flex gap-2">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                {t("onboarding.back")}
              </Button>
            ) : null}
            {step < STEPS - 1 ? (
              <Button onClick={() => setStep(step + 1)}>{t("onboarding.next")}</Button>
            ) : (
              <Button onClick={finish}>{t("onboarding.finish")}</Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
