export function matchesPersonalSearch(query: string, values: Array<string | null | undefined>): boolean {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const searchableText = values.filter(Boolean).join(" ").toLocaleLowerCase();
  return terms.every((term) => searchableText.includes(term));
}
