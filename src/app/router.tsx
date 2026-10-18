import type { ReactNode } from "react";
import { createBrowserRouter, Navigate, type RouteObject } from "react-router";
import { CalendarPage } from "@/features/calendar";
import { JournalPage } from "@/features/journal";
import { TodayPage } from "@/features/today";
import { TodoPage } from "@/features/todo";
import { AppShell } from "./layout";
import { HOME_PATH, NAV_ITEMS } from "./navigation";
import { DevUiPage } from "./pages/DevUiPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";

/** Screens already built; the rest keep the placeholder. */
const PAGES: Record<string, ReactNode> = {
  "/today": <TodayPage />,
  "/calendar": <CalendarPage />,
  "/journal": <JournalPage />,
  "/todo": <TodoPage />,
};

const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [{ path: "dev/ui", element: <DevUiPage /> }]
  : [];

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to={HOME_PATH} replace /> },
      ...NAV_ITEMS.map((item) => ({
        path: item.path.slice(1),
        element: PAGES[item.path] ?? (
          <PlaceholderPage titleKey={item.labelKey} scope={item.scope} />
        ),
      })),
      ...devRoutes,
      { path: "*", element: <Navigate to={HOME_PATH} replace /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
