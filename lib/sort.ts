// /lib/sort.ts
// A `where("userIds","array-contains",uid)` query combined with
// `orderBy("createdAt","desc")` is a composite query in Firestore terms
// (filter and sort on different fields) — it needs a composite index that
// doesn't exist in this project, which is exactly what produces a
// failed-precondition error at query time. Fetching the (small, per-user)
// unordered set with just the where() clause and sorting client-side
// avoids needing that index at all, at the cost of fetching slightly more
// documents than a single `limit(1)` would — negligible here, since one
// person only ever has a handful of pairs.

export function mostRecentByCreatedAt<T extends { createdAt: string }>(docs: T[]): T | null {
  if (docs.length === 0) return null;
  return docs.reduce((newest, doc) => (doc.createdAt > newest.createdAt ? doc : newest));
}
