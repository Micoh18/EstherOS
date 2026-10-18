import { createElement } from "react";
import { List, type LucideProps } from "lucide-react";
import { LIST_ICONS, type ListIconKey } from "./listIcons";

/** Icon of a list from its stored key (`todo_list.icon`); a plain list icon when unknown. */
export function ListIcon({ icon, ...props }: { icon: string | null } & LucideProps) {
  const known = icon !== null && Object.hasOwn(LIST_ICONS, icon);
  return createElement(known ? LIST_ICONS[icon as ListIconKey].icon : List, props);
}
