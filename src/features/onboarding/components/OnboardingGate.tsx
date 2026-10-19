import { useEffect, useState } from "react";
import { getAllSettings, saveSetting } from "@/features/settings";
import { onDbChanged } from "@/shared/db";
import { log } from "@/shared/lib/log";
import { OnboardingDialog } from "./OnboardingDialog";

type GateState = { open: false } | { open: true; name: string };

/**
 * Shows the onboarding while `onboarding_done` is false (first run, or after "Borrar todos los
 * datos"). Finishing or skipping marks it done. Mount once inside the app shell.
 */
export function OnboardingGate() {
  const [state, setState] = useState<GateState>({ open: false });

  useEffect(() => {
    let active = true;
    const check = () => {
      getAllSettings().then(
        (settings) => {
          if (!active) return;
          // After an import the copy may already be past the onboarding: close it then.
          setState(
            settings.onboarding_done ? { open: false } : { open: true, name: settings.user_name },
          );
        },
        (error: unknown) => log.warn("Could not read onboarding state", error),
      );
    };
    check();
    const off = onDbChanged("setting", (table) => {
      if (table === "*") check();
    });
    return () => {
      active = false;
      off();
    };
  }, []);

  if (!state.open) return null;

  return (
    <OnboardingDialog
      initialName={state.name}
      onFinish={(name) => {
        setState({ open: false });
        void saveSetting("user_name", name);
        void saveSetting("onboarding_done", true);
      }}
    />
  );
}
