import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setDbExecutor, type DbExecutor } from "@/shared/db";
import { useMemoryDb } from "../../../tests/unit/helpers/memoryDb";
import { useDaySummary } from "./hooks";

const DAY = "2026-10-18";

/** Wraps the in-memory executor so reads of one table hang or fail. */
function withTaskReads(executor: DbExecutor, mode: "hang" | "fail"): DbExecutor {
  return {
    ...executor,
    select(sql, params) {
      if (/\bFROM task\b/.test(sql)) {
        return mode === "hang"
          ? new Promise(() => {})
          : Promise.reject(new Error("task table is gone"));
      }
      return executor.select(sql, params);
    },
  };
}

describe("useDaySummary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it("keeps loading until both the tasks and the journal have arrived", async () => {
    const { executor } = useMemoryDb();
    setDbExecutor(withTaskReads(executor, "hang"));
    const { result } = renderHook(() => useDaySummary(DAY));

    // The journal answers right away; the tasks never do.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("reports a failed task query instead of an empty day", async () => {
    const { executor } = useMemoryDb();
    setDbExecutor(withTaskReads(executor, "fail"));
    const { result } = renderHook(() => useDaySummary(DAY));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("is ready without error when both load", async () => {
    useMemoryDb();
    const { result } = renderHook(() => useDaySummary(DAY));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual({ tasks: [], journal: [] });
  });
});
