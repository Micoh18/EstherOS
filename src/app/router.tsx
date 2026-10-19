import type { ReactNode } from "react";
import { createBrowserRouter, Navigate, type RouteObject } from "react-router";
import { CalendarPage } from "@/features/calendar";
import { JournalPage } from "@/features/journal";
import { SettingsPage } from "@/features/settings";
import { TodayPage } from "@/features/today";
import { TodoPage } from "@/features/todo";
import { RouteErrorScreen } from "./errors/ErrorBoundary";
import { AppShell } from "./layout";
import { HOME_PATH, NAV_ITEMS } from "./navigation";
import { DevUiPage } from "./pages/DevUiPage";
import { StartRedirect } from "./pages/StartRedirect";

const PAGES: Record<string, ReactNode> = {
  "/today": <TodayPage />,
  "/calendar": <CalendarPage />,
  "/journal": <JournalPage />,
  "/todo": <TodoPage />,
  "/settings": <SettingsPage />,
};

const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [{ path: "dev/ui", element: <DevUiPage /> }]
  : [];

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteErrorScreen />,
    children: [
      { index: true, element: <StartRedirect /> },
      ...NAV_ITEMS.map((item) => ({
        path: item.path.slice(1),
        element: PAGES[item.path],
      })),
      ...devRoutes,
      { path: "*", element: <Navigate to={HOME_PATH} replace /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
