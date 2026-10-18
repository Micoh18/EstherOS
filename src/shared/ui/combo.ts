/** Splits "Ctrl+Shift+T" into keys, keeping a literal "+" key ("Ctrl++"). */
export function splitCombo(combo: string): string[] {
  const parts = combo.split("+");
  const keys: string[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    if (parts[i] !== "") {
      keys.push(parts[i]);
    } else if (i < parts.length - 1) {
      // Two consecutive separators: the second "+" is the key itself.
      keys.push("+");
      i += 1;
    }
  }
  return keys;
}
