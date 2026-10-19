import type { CSSProperties } from "react";
import type { ThemeName } from "@/shared/theme";

/**
 * Theme previews need every theme's tokens at once, but each theme defines them only on
 * `:root[data-theme="<name>"]`. Instead of copying the values here, read them from the loaded
 * theme stylesheets and apply them as inline custom properties on the preview, so previews
 * always match the real themes.
 *
 * TODO(A1): if the theme selectors also matched `[data-theme="<name>"]` on any element, the
 * preview could just set `data-theme` and this module could go.
 */

const cache = new Map<ThemeName, CSSProperties>();

function collect(rules: CSSRuleList, selector: string, into: Record<string, string>) {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule && rule.selectorText.includes(selector)) {
      for (const property of Array.from(rule.style)) {
        if (property.startsWith("--")) into[property] = rule.style.getPropertyValue(property);
      }
    } else if ("cssRules" in rule && rule.cssRules) {
      // @layer, @media and other grouping rules.
      collect(rule.cssRules as CSSRuleList, selector, into);
    }
  }
}

/** Custom properties of a theme as an inline style object (empty when no stylesheet is loaded). */
export function readThemeTokens(theme: ThemeName): CSSProperties {
  const cached = cache.get(theme);
  if (cached) return cached;
  const tokens: Record<string, string> = {};
  if (typeof document !== "undefined") {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        collect(sheet.cssRules, `[data-theme="${theme}"]`, tokens);
      } catch {
        // Stylesheets from another origin cannot be read; themes are always local.
      }
    }
  }
  const style = tokens as CSSProperties;
  if (Object.keys(tokens).length > 0) cache.set(theme, style);
  return style;
}
