import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "@/app/providers";
import { getSetting, setSetting } from "@/features/settings";
import { setDbExecutor } from "@/shared/db";
import { OnboardingGate } from "../components/OnboardingGate";
import { useMemoryDb } from "../../../../tests/unit/helpers/memoryDb";

function renderGate() {
  return render(
    <ThemeProvider>
      <OnboardingGate />
    </ThemeProvider>,
  );
}

let db: ReturnType<typeof useMemoryDb>["raw"];

beforeEach(() => {
  localStorage.clear();
  db = useMemoryDb().raw;
});

afterEach(() => {
  setDbExecutor(null);
  db.close();
});

describe("OnboardingGate", () => {
  it("shows the three steps on first run and marks onboarding_done", async () => {
    const view = renderGate();
    expect(await screen.findByText("Te doy la bienvenida a Estheros ♡")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("¿Cómo quieres que te llame?"), {
      target: { value: "Esther" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(await screen.findByText("Elige tu tema")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("radio", { name: /White/ }));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(await screen.findByText("Listo, Esther ♡")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Empezar" }));

    await waitFor(async () => expect(await getSetting("onboarding_done")).toBe(true));
    expect(await getSetting("user_name")).toBe("Esther");
    expect(await getSetting("theme")).toBe("white");
    view.unmount();

    // Next start: nothing shows.
    renderGate();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText("Te doy la bienvenida a Estheros ♡")).toBeNull();
  });

  it("can be skipped", async () => {
    renderGate();
    fireEvent.click(await screen.findByRole("button", { name: "Saltar" }));
    await waitFor(async () => expect(await getSetting("onboarding_done")).toBe(true));
  });

  it("stays hidden when onboarding is already done", async () => {
    await setSetting("onboarding_done", true);
    renderGate();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
