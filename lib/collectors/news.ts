import { XMLParser } from "fast-xml-parser";
import type { NewsItem } from "@/types";

export async function fetchNews(keyword: string, max: number): Promise<NewsItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=en&gl=US&ceid=US:en`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ResearchNavigator/1.0)" },
  });
  if (!res.ok) throw new Error(`Google News ${res.status}`);
  const xml = await res.text();

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const parsed = parser.parse(xml) as {
    rss?: { channel?: { item?: unknown[] | Record<string, unknown> } };
  };

  const rawItems = parsed.rss?.channel?.item;
  if (!rawItems) return [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];

  return (items as Record<string, unknown>[]).slice(0, max).map((item) => {
    const sourceField = item.source as { "#text"?: string; "@_url"?: string } | string | undefined;
    const sourceName =
      typeof sourceField === "string"
        ? sourceField
        : (sourceField as Record<string, string>)?.["#text"] ?? "Unknown";

    return {
      title: (item.title as string) ?? "(No title)",
      url: (item.link as string) ?? "",
      source: sourceName,
      published: (item.pubDate as string) ?? "",
      summary: (item.description as string) ?? "",
    };
  });
}
