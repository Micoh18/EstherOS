import { Component, useEffect, type ErrorInfo, type ReactNode } from "react";
import { useRouteError } from "react-router";
import { log } from "@/shared/lib/log";
import { ErrorScreen } from "./ErrorScreen";

interface ErrorBoundaryProps {
  children: ReactNode;
  onRestart?: () => void;
}

interface ErrorBoundaryState {
  error: unknown;
  componentStack: string | null;
  failed: boolean;
}

/** Last line of defence around the whole app: logs the crash and shows the error screen. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, componentStack: null, failed: false };

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    return { error, failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    log.error("render crashed", error, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? null });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <ErrorScreen
        error={this.state.error}
        componentStack={this.state.componentStack}
        onRestart={this.props.onRestart}
      />
    );
  }
}

/**
 * `errorElement` of the root route: the data router catches errors thrown while rendering a
 * page before they reach `ErrorBoundary`, so it shows the same screen.
 */
export function RouteErrorScreen() {
  const error = useRouteError();
  useEffect(() => log.error("route crashed", error), [error]);
  return <ErrorScreen error={error} />;
}
