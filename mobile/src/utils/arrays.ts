// src/utils/arrays.ts
export function uniqById<T extends { _id?: string | number }>(arr: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of arr) {
    const k = String(it?._id ?? '');
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}
