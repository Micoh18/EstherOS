import { es, type I18nKey } from "./es";

export type { I18nKey };

export type I18nVars = Record<string, string | number>;

const PLACEHOLDER = /\{(\w+)\}/g;

/** Returns the UI string for `key`, replacing `{name}` placeholders with `vars.name`. */
export function t(key: I18nKey, vars?: I18nVars): string {
  const template: string = es[key];
  if (!vars) return template;
  return template.replace(PLACEHOLDER, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function isI18nKey(key: string): key is I18nKey {
  return Object.hasOwn(es, key);
}
