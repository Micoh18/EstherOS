import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { getStartPath } from "@/features/settings";

/** Index route: opens the screen chosen in "Pantalla de inicio" (Today by default). */
export function StartRedirect() {
  const [path, setPath] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getStartPath().then((start) => {
      if (active) setPath(start);
    });
    return () => {
      active = false;
    };
  }, []);

  return path ? <Navigate to={path} replace /> : null;
}
