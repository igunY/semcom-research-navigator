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
  doi?: string;
  topics?: { display_name: string }[];
  open_access?: { is_oa: boolean };
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
  const fromDate = new Date();
  fromDate.setFullYear(fromDate.getFullYear() - 1);
  const fromDateStr = fromDate.toISOString().split("T")[0];

  // abstractフィルタで脱落する分を補うため多めに取得してスライス
  const fetchCount = Math.max(max * 3, 40);
  const url =
    `https://api.openalex.org/works?search=${encodeURIComponent(keyword)}` +
    `&per-page=${fetchCount}` +
    `&filter=from_publication_date:${fromDateStr}` +
    `&select=id,title,abstract_inverted_index,authorships,publication_year,cited_by_count,doi,topics,open_access` +
    `&mailto=hamayuzuki628@gmail.com`;

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`OpenAlex ${res.status}`);
  const data = (await res.json()) as { results: OAWork[] };

  const items: PaperItem[] = [];
  for (const w of data.results ?? []) {
    const abstract = reconstructAbstract(w.abstract_inverted_index);
    if (!abstract) continue;

    const authGroups = w.authorships.map((a) => a.institutions ?? []);
    const doi = w.doi ?? "";
    const url = doi.startsWith("http") ? doi : doi ? `https://doi.org/${doi}` : "";
    const topics = (w.topics ?? []).map((t) => t.display_name).filter(Boolean).slice(0, 5);

    items.push({
      title: w.title ?? "(No title)",
      url,
      authors: w.authorships.map((a) => a.author.display_name),
      year: w.publication_year?.toString() ?? null,
      abstract,
      institutions: w.authorships.flatMap((a) => a.institutions.map((i) => i.display_name)),
      affiliationCategory: classifyAffiliation(authGroups),
      citationCount: w.cited_by_count ?? 0,
      source: "OpenAlex" as const,
      topics,
      isOa: w.open_access?.is_oa ?? false,
    });
  }
  return items.slice(0, max);
}

export async function fetchPapers(
  keyword: string,
  max: number
): Promise<{ items: PaperItem[]; warning: string }> {
  const items = await fetchOpenAlex(keyword, max);
  return { items, warning: "" };
}
