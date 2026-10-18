/** `text` with every case-insensitive occurrence of `query` wrapped in a soft highlight. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return <>{text}</>;
  const haystack = text.toLocaleLowerCase();
  const parts: { text: string; match: boolean }[] = [];
  let from = 0;
  for (let index = haystack.indexOf(needle); index >= 0; index = haystack.indexOf(needle, from)) {
    if (index > from) parts.push({ text: text.slice(from, index), match: false });
    parts.push({ text: text.slice(index, index + needle.length), match: true });
    from = index + needle.length;
  }
  if (from < text.length) parts.push({ text: text.slice(from), match: false });
  return (
    <>
      {parts.map((part, i) =>
        part.match ? (
          <mark key={i} className="rounded-sm bg-accent-soft px-0.5 text-text">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}
