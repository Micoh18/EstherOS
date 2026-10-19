import { lazy, Suspense, type ComponentType } from "react";
import { t } from "@/shared/i18n";

type GalleryModule = {
  default?: ComponentType;
  UiGallery?: ComponentType;
  PerfBench?: ComponentType;
};

// Globs resolve to nothing when the files do not exist yet, so this builds before A1 lands.
const galleryModules = import.meta.glob<GalleryModule>([
  "../../dev/UiGallery.tsx",
  "../../dev/index.ts",
]);

function Missing() {
  return (
    <section className="p-6">
      <h1 className="font-display text-3xl text-text">{t("shell.page.devUi")}</h1>
      <p className="text-text-muted">{t("shell.page.devUiMissing")}</p>
    </section>
  );
}

const Gallery = lazy(async () => {
  for (const load of Object.values(galleryModules)) {
    const module = await load();
    const component = module.UiGallery ?? module.default;
    if (component) return { default: component };
  }
  return { default: Missing };
});

/** `/dev/ui`: A1's component gallery when it exists, a placeholder otherwise. */
export function DevUiPage() {
  return (
    <Suspense fallback={null}>
      <Gallery />
    </Suspense>
  );
}

const Bench = lazy(async () => {
  for (const load of Object.values(galleryModules)) {
    const module = await load();
    if ("PerfBench" in module && module.PerfBench) return { default: module.PerfBench };
  }
  return { default: Missing };
});

/** `/dev/perf`: performance bench of the polish pass (see src/dev/PerfBench.tsx). */
export function DevPerfPage() {
  return (
    <Suspense fallback={null}>
      <Bench />
    </Suspense>
  );
}
