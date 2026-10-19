import { recentErrors } from "@/shared/lib/log";

function describe(error: unknown): string {
  if (error instanceof Error) return error.stack ?? `${error.name}: ${error.message}`;
  return String(error);
}

/** Plain-text report for "Copiar detalle": the error, where it happened and recent errors. */
export function errorDetail(error: unknown, componentStack?: string | null): string {
  const lines = [
    `Estheros · ${new Date().toISOString()}`,
    `Ruta: ${window.location.pathname}${window.location.search}`,
    `Navegador: ${navigator.userAgent}`,
    "",
    describe(error),
  ];
  if (componentStack) lines.push("", "Componentes:", componentStack.trim());
  const recent = recentErrors();
  if (recent.length > 0) {
    lines.push("", "Errores recientes:", ...recent.map((entry) => `${entry.at} ${entry.message}`));
  }
  return lines.join("\n");
}
