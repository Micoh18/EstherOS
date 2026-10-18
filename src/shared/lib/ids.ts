import { nanoid } from "nanoid";

/** Text primary key for every entity (nanoid, 21 chars). */
export function newId(): string {
  return nanoid();
}
