import type { HNItem } from "@/types";

interface AlgoliaHit {
  objectID: string;
  title: string;
  url?: string;
  points: number;
  num_comments: number;
  created_at: string;
}

export async function fetchHN(keyword: string, max: number = 30): Promise<HNItem[]> {
  const url =
    `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(keyword)}` +
    `&tags=story&hitsPerPage=${max}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HN Algolia ${res.status}`);
  const data = (await res.json()) as { hits: AlgoliaHit[] };

  return (data.hits ?? []).map((h) => ({
    title: h.title ?? "(No title)",
    url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
    hnUrl: `https://news.ycombinator.com/item?id=${h.objectID}`,
    points: h.points ?? 0,
    numComments: h.num_comments ?? 0,
    createdAt: h.created_at ?? "",
  }));
}
