import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ensureTag, setDbExecutor, type DbExecutor } from "@/shared/db";
import { useMemoryDb } from "../../../../tests/unit/helpers/memoryDb";
import { TagManager } from "../components/TagManager";

let executor: DbExecutor;
let renames: number;
let failLookup: boolean;

beforeEach(() => {
  executor = useMemoryDb().executor;
  renames = 0;
  failLookup = false;
  setDbExecutor({
    ...executor,
    async select(sql, params) {
      if (failLookup && /FROM tag WHERE name/i.test(sql)) throw new Error("db is gone");
      return executor.select(sql, params);
    },
    async execute(sql, params) {
      if (sql.startsWith("UPDATE tag SET name")) renames += 1;
      return executor.execute(sql, params);
    },
  });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

async function startRename(name: string) {
  render(<TagManager />);
  fireEvent.click(await screen.findByRole("button", { name: `Renombrar «${name}»` }));
  return screen.getByRole("textbox", { name: `Renombrar «${name}»` });
}

describe("TagManager", () => {
  it("saves a rename once when Enter is followed by the blur", async () => {
    await ensureTag("viajes");
    const input = await startRename("viajes");
    fireEvent.change(input, { target: { value: "paseos" } });
    act(() => {
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.blur(input);
    });

    expect(await screen.findByText("paseos")).toBeInTheDocument();
    expect(renames).toBe(1);
  });

  it("shows an error when the name lookup fails, without an unhandled rejection", async () => {
    await ensureTag("viajes");
    const input = await startRename("viajes");
    failLookup = true;
    fireEvent.change(input, { target: { value: "paseos" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(await screen.findByText("No pude guardar la etiqueta")).toBeInTheDocument();
    await waitFor(() => expect(renames).toBe(0));
  });
});
