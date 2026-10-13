/** Conservative display-only rejection of observed test placeholders; never deletes CMS data. */
export function usableEditorialTitle(title: string): boolean {
  const cleaned = title.trim();
  if (!cleaned || /^سؤالل+$/u.test(cleaned)) return false;
  const words = cleaned.split(/\s+/);
  if (words.length >= 3 && new Set(words).size === 1) return false;
  const letters = cleaned.replace(/[^\p{L}]/gu, "");
  // Legitimate short headings such as AI and S&P must not be treated as filler.
  if (letters.length < 2 || new Set(letters.toLowerCase()).size < 2) return false;
  return true;
}
