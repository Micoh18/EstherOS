import { act, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureUnhandledErrors, recentErrors } from "@/shared/lib/log";
import { ErrorBoundary, RouteErrorScreen } from "./ErrorBoundary";

function Broken(): never {
  throw new Error("the kettle exploded");
}

let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
});

afterEach(() => vi.restoreAllMocks());

describe("ErrorBoundary", () => {
  it("shows the cozy screen with restart and copy instead of a blank window", async () => {
    const onRestart = vi.fn();
    render(
      <ErrorBoundary onRestart={onRestart}>
        <Broken />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("heading", { name: "Algo salió mal ♡" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reiniciar" }));
    expect(onRestart).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copiar detalle" }));
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    const detail = String(writeText.mock.calls[0][0]);
    expect(detail).toContain("the kettle exploded");
    expect(detail).toContain("Componentes:");
    expect(screen.getByText("Detalle copiado.")).toBeInTheDocument();
  });

  it("says so when the detail cannot be copied", async () => {
    writeText.mockRejectedValue(new Error("no clipboard"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copiar detalle" }));
    });
    expect(screen.getByText("No pude copiar el detalle.")).toBeInTheDocument();
  });

  it("catches errors of a page through the router error element", () => {
    const router = createMemoryRouter([
      { path: "/", element: <Broken />, errorElement: <RouteErrorScreen /> },
    ]);
    render(<RouterProvider router={router} />);
    expect(screen.getByRole("heading", { name: "Algo salió mal ♡" })).toBeInTheDocument();
  });
});

describe("error screen and the frameless window", () => {
  it("the full-window screen brings its own window controls", () => {
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
    expect(document.querySelector("[data-tauri-drag-region]")).not.toBeNull();
  });

  it("a crashed page keeps the shell around it", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const router = createMemoryRouter([
      {
        path: "/",
        element: (
          <div>
            <header>shell title bar</header>
            <Outlet />
          </div>
        ),
        errorElement: <RouteErrorScreen />,
        children: [
          {
            errorElement: <RouteErrorScreen variant="page" />,
            children: [{ index: true, element: <Broken /> }],
          },
        ],
      },
    ]);
    render(<RouterProvider router={router} />);
    expect(screen.getByRole("heading", { name: "Algo salió mal ♡" })).toBeInTheDocument();
    expect(screen.getByText("shell title bar")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cerrar" })).toBeNull();
  });
});

describe("captureUnhandledErrors", () => {
  it("sends uncaught errors and rejections to the log", () => {
    const stop = captureUnhandledErrors();
    window.dispatchEvent(new ErrorEvent("error", { error: new Error("lost in a handler") }));
    const rejection = new Event("unhandledrejection") as PromiseRejectionEvent;
    Object.defineProperty(rejection, "reason", { value: new Error("forgot to catch") });
    window.dispatchEvent(rejection);
    stop();

    const messages = recentErrors().map((entry) => entry.message);
    expect(messages.some((m) => m.includes("lost in a handler"))).toBe(true);
    expect(messages.some((m) => m.includes("forgot to catch"))).toBe(true);
  });
});
