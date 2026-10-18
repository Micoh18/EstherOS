import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetAll } from "@/shared/hotkeys";
import { AppProviders } from "./providers";
import { routes } from "./router";
import { THEME_STORAGE_KEY } from "./theme";

const windowMock = vi.hoisted(() => ({
  close: vi.fn(),
  minimize: vi.fn(),
  toggleMaximize: vi.fn(),
  isMaximized: vi.fn(async () => false),
  onResized: vi.fn(async () => () => {}),
}));

vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => true }));
vi.mock("@tauri-apps/api/window", () => ({ getCurrentWindow: () => windowMock }));

function renderShell(path = "/") {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return router;
}

function press(key: string, code: string, init: KeyboardEventInit = {}) {
  act(() => {
    fireEvent.keyDown(window, { key, code, ...init });
  });
}

beforeEach(() => {
  localStorage.clear();
  resetAll();
  document.documentElement.dataset.theme = "pink";
});

describe("shell", () => {
  it("redirects / to /today", async () => {
    const router = renderShell();
    expect(await screen.findByRole("region", { name: "Hoy" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/today");
  });

  it("navigates with Ctrl+1..5 and the sidebar", async () => {
    const router = renderShell("/today");
    await screen.findByRole("region", { name: "Hoy" });
    press("2", "Digit2", { ctrlKey: true });
    expect(router.state.location.pathname).toBe("/calendar");
    press("5", "Digit5", { ctrlKey: true });
    expect(router.state.location.pathname).toBe("/settings");
    fireEvent.click(screen.getByRole("link", { name: /Tareas/ }));
    expect(router.state.location.pathname).toBe("/todo");
  });

  it("cycles the theme with Ctrl+Shift+T and the title bar button", async () => {
    renderShell("/today");
    await screen.findByRole("region", { name: "Hoy" });
    press("T", "KeyT", { ctrlKey: true, shiftKey: true });
    expect(document.documentElement.dataset.theme).toBe("white");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("white");
    fireEvent.click(screen.getByRole("button", { name: /Cambiar theme/ }));
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("collapses the sidebar with Ctrl+B", async () => {
    renderShell("/today");
    await screen.findByRole("region", { name: "Hoy" });
    expect(screen.getByRole("button", { name: /Contraer/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    press("b", "KeyB", { ctrlKey: true });
    expect(screen.getByRole("button", { name: /Expandir/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("opens the shortcuts placeholder with Ctrl+/ and closes it with Escape", async () => {
    renderShell("/today");
    await screen.findByRole("region", { name: "Hoy" });
    press("/", "Slash", { ctrlKey: true });
    expect(await screen.findByRole("dialog", { name: "Atajos de teclado" })).toBeInTheDocument();
    press("Escape", "Escape");
    await waitFor(() => expect(document.querySelector("[data-escape-close]")).toBeNull());
  });

  it("never closes the window with Escape", async () => {
    renderShell("/today");
    await screen.findByRole("region", { name: "Hoy" });
    press("Escape", "Escape");
    press("Escape", "Escape");
    expect(windowMock.close).not.toHaveBeenCalled();
    expect(screen.getByRole("region", { name: "Hoy" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(windowMock.close).toHaveBeenCalledOnce();
  });
});
