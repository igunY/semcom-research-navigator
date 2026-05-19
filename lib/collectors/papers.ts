import { XMLParser } from "fast-xml-parser";
import type { PaperItem } from "@/types";

// ── OpenAlex ──────────────────────────────────────────────────────────────────

interface OAWork {
  id: string;
  title: string;
  abstract_inverted_index: Record<string, number[]> | null;
  authorships: {
    author: { display_name: string };
    institutions: { display_name: string; type: string }[];
  }[];
  publication_year: number | null;
  cited_by_count: number;
  primary_location?: { landing_page_url?: string; source?: { display_name: string } };
  doi?: string;
}

function reconstructAbstract(idx: Record<string, number[]> | null): string {
  if (!idx) return "";
  const arr: [number, string][] = [];
  for (const [word, positions] of Object.entries(idx)) {
    for (const pos of positions) arr.push([pos, word]);
  }
  arr.sort((a, b) => a[0] - b[0]);
  return arr.map(([, w]) => w).join(" ");
}

function classifyAffiliation(
  institutions: { type: string }[][]
): PaperItem["affiliationCategory"] {
  const types = institutions.flat().map((i) => i.type?.toLowerCase() ?? "");
  if (types.length === 0) return "Unknown";
  const academic = types.some((t) => t === "education" || t === "nonprofit");
  const corporate = types.some((t) => t === "company" || t === "healthcare");
  if (academic && corporate) return "Mixed";
  if (corporate) return "Corporate";
  if (academic) return "Academic";
  return "Unknown";
}

async function fetchOpenAlex(keyword: string, max: number): Promise<PaperItem[]> {
  const url =
    `https://api.openalex.org/works?search=${encodeURIComponent(keyword)}` +
    `&per-page=${max}&sort=cited_by_count:desc` +
    `&select=id,title,abstract_inverted_index,authorships,publication_year,cited_by_count,primary_location,doi` +
    `&mailto=research-navigator@example.com`;

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`OpenAlex ${res.status}`);
  const data = (await res.json()) as { results: OAWork[] };

  return (data.results ?? []).map((w) => {
    const authGroups = w.authorships.map((a) => a.institutions ?? []);
    return {
      title: w.title ?? "(No title)",
      url: w.primary_location?.landing_page_url ?? (w.doi ? `https://doi.org/${w.doi}` : ""),
      authors: w.authorships.map((a) => a.author.display_name),
      year: w.publication_year?.toString() ?? null,
      abstract: reconstructAbstract(w.abstract_inverted_index),
      institutions: w.authorships.flatMap((a) => a.institutions.map((i) => i.display_name)),
      affiliationCategory: classifyAffiliation(authGroups),
      citationCount: w.cited_by_count ?? 0,
      source: "OpenAlex" as const,
    };
  });
}

// ── arXiv ─────────────────────────────────────────────────────────────────────

async function fetchArxiv(keyword: string, max: number): Promise<{ items: PaperItem[]; warning: string }> {
  const url =
    `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(keyword)}` +
    `&max_results=${max}&sortBy=submittedDate&sortOrder=descending`;

  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 429) return { items: [], warning: "arXiv のレート制限に達しました。少し待ってから再検索してください。" };
    throw new Error(`arXiv ${res.status}`);
  }
  const xml = await res.text();

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const parsed = parser.parse(xml) as {
    feed?: { entry?: unknown[] | Record<string, unknown> };
  };

  const rawEntries = parsed.feed?.entry;
  if (!rawEntries) return { items: [], warning: "" };
  const entries = Array.isArray(rawEntries) ? rawEntries : [rawEntries];

  const items: PaperItem[] = (entries as Record<string, unknown>[]).map((e) => {
    const id = (e.id as string) ?? "";
    const url = id.replace("http://", "https://");
    const authors = Array.isArray(e.author)
      ? (e.author as { name: string }[]).map((a) => a.name)
      : e.author
      ? [(e.author as { name: string }).name]
      : [];
    const published = (e.published as string) ?? "";
    const year = published.slice(0, 4) || null;

    return {
      title: (e.title as string)?.trim() ?? "(No title)",
      url,
      authors,
      year,
      abstract: (e.summary as string)?.trim() ?? "",
      institutions: [],
      affiliationCategory: "Unknown" as const,
      citationCount: 0,
      source: "arXiv" as const,
    };
  });

  return { items, warning: "" };
}

// ── Merge ─────────────────────────────────────────────────────────────────────

export async function fetchPapers(
  keyword: string,
  max: number
): Promise<{ items: PaperItem[]; warning: string }> {
  const [oaResult, arxivResult] = await Promise.allSettled([
    fetchOpenAlex(keyword, max),
    fetchArxiv(keyword, max),
  ]);

  const oaItems = oaResult.status === "fulfilled" ? oaResult.value : [];
  const { items: arxivItems, warning } =
    arxivResult.status === "fulfilled" ? arxivResult.value : { items: [], warning: "" };

  const seen = new Set(oaItems.map((p) => p.title.toLowerCase().slice(0, 60)));
  const merged = [
    ...oaItems,
    ...arxivItems.filter((p) => !seen.has(p.title.toLowerCase().slice(0, 60))),
  ].slice(0, max * 2);

  return { items: merged, warning };
}
