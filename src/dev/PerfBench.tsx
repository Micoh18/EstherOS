import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { CalendarPage } from "@/features/calendar";
import { TodoPage, todoViewPath } from "@/features/todo";
import { t } from "@/shared/i18n";

/**
 * `/dev/perf`, only in dev builds or builds made with `VITE_PERF=1` (which also open it at
 * start). Measures, inside the real webview, the two interactive targets of the polish pass:
 * moving 24 months back and forth in the calendar and showing a list of seeded tasks
 * (`scripts/seed.ts`). The app drives its own buttons and scroll; results end up in
 * `window.__estherosPerf` for a read-only CDP `evaluate`, and on screen.
 */

interface FrameStats {
  frames: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  /** Frames longer than 17.5 ms (a missed 60 Hz frame). */
  slow: number;
}

export interface PerfResults {
  calendar?: { steps: number; frames: FrameStats; stepLatencyP95: number; stepLatencyMax: number };
  todo?: { rows: number; msToRows: number; scrollFrames: FrameStats };
  done: boolean;
}

declare global {
  interface Window {
    __estherosPerf?: PerfResults;
  }
}

const STEP_MS = 150;
const SLOW_FRAME_MS = 17.5;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

function stats(deltas: number[]): FrameStats {
  const sorted = [...deltas].sort((a, b) => a - b);
  const round = (n: number) => Math.round(n * 10) / 10;
  return {
    frames: sorted.length,
    p50: round(percentile(sorted, 50)),
    p95: round(percentile(sorted, 95)),
    p99: round(percentile(sorted, 99)),
    max: round(sorted.at(-1) ?? 0),
    slow: sorted.filter((d) => d > SLOW_FRAME_MS).length,
  };
}

/** Records the time between animation frames until `stop()` is called. */
function frameRecorder() {
  const deltas: number[] = [];
  let last = performance.now();
  let running = true;
  const tick = (now: number) => {
    deltas.push(now - last);
    last = now;
    if (running) requestAnimationFrame(tick);
  };
  requestAnimationFrame((now) => {
    last = now;
    requestAnimationFrame(tick);
  });
  return {
    stop: () => {
      running = false;
      return deltas;
    },
  };
}

async function waitFor<T>(read: () => T | null | undefined, timeoutMs = 10_000): Promise<T> {
  const start = performance.now();
  for (;;) {
    const value = read();
    if (value) return value;
    if (performance.now() - start > timeoutMs) throw new Error("perf: timed out");
    await nextFrame();
  }
}

const button = (root: HTMLElement, name: string) =>
  root.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`);

async function benchCalendar(root: HTMLElement): Promise<NonNullable<PerfResults["calendar"]>> {
  const next = await waitFor(() => button(root, t("calendar.next")));
  const prev = await waitFor(() => button(root, t("calendar.prev")));
  await sleep(1_000); // first data load and fonts
  const plan = [...Array(24).fill(next), ...Array(48).fill(prev), ...Array(24).fill(next)];
  const latencies: number[] = [];
  const recorder = frameRecorder();
  for (const target of plan as HTMLButtonElement[]) {
    const start = performance.now();
    target.click();
    await nextFrame();
    await nextFrame();
    latencies.push(performance.now() - start);
    await sleep(STEP_MS);
  }
  const sortedLatency = [...latencies].sort((a, b) => a - b);
  return {
    steps: plan.length,
    frames: stats(recorder.stop()),
    stepLatencyP95: Math.round(percentile(sortedLatency, 95) * 10) / 10,
    stepLatencyMax: Math.round((sortedLatency.at(-1) ?? 0) * 10) / 10,
  };
}

async function benchTodo(root: HTMLElement, mountedAt: number) {
  const rowsOf = () => root.querySelectorAll("[data-task-row]").length;
  // Rows arrive in one render once the query resolves; wait until the count stops growing.
  await waitFor(() => rowsOf() > 0, 15_000);
  let count = rowsOf();
  let stableSince = performance.now();
  let msToRows = performance.now() - mountedAt;
  while (performance.now() - stableSince < 500) {
    await nextFrame();
    const current = rowsOf();
    if (current !== count) {
      count = current;
      stableSince = performance.now();
      msToRows = stableSince - mountedAt;
    }
  }
  const list = await waitFor(() => {
    const rows = root.querySelector("[data-task-row]");
    let node = rows?.parentElement ?? null;
    while (node && node.scrollHeight <= node.clientHeight) node = node.parentElement;
    return node;
  });
  const recorder = frameRecorder();
  while (list.scrollTop + list.clientHeight < list.scrollHeight - 1) {
    list.scrollTop += 120;
    await nextFrame();
  }
  return { rows: count, msToRows: Math.round(msToRows), scrollFrames: stats(recorder.stop()) };
}

export function PerfBench() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"calendar" | "todo" | "done">("calendar");
  const [results, setResults] = useState<PerfResults>({ done: false });
  const todoMountedAt = useRef(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    const publish = (next: PerfResults) => {
      window.__estherosPerf = next;
      if (!cancelled) setResults(next);
    };
    if (phase === "calendar") {
      void benchCalendar(root).then((calendar) => {
        publish({ ...window.__estherosPerf, calendar, done: false });
        todoMountedAt.current = performance.now();
        navigate(`/dev/perf${todoViewPath("all").slice("/todo".length)}`, { replace: true });
        setPhase("todo");
      });
    } else if (phase === "todo") {
      void benchTodo(root, todoMountedAt.current).then((todo) => {
        publish({ ...window.__estherosPerf, todo, done: true });
        setPhase("done");
      });
    }
    return () => {
      cancelled = true;
    };
  }, [phase, navigate]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={rootRef} className="min-h-0 flex-1">
        {phase === "calendar" ? <CalendarPage /> : phase === "todo" ? <TodoPage /> : null}
      </div>
      <pre data-testid="perf-results" className="max-h-[40%] overflow-auto p-4 text-xs text-text">
        {JSON.stringify(results, null, 2)}
      </pre>
    </div>
  );
}
