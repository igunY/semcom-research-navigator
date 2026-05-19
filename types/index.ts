export interface PaperItem {
  title: string;
  url: string;
  authors: string[];
  year: string | null;
  abstract: string;
  institutions: string[];
  affiliationCategory: "Academic" | "Corporate" | "Mixed" | "Unknown";
  citationCount: number;
  source: "OpenAlex" | "arXiv";
}

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  published: string;
  summary: string;
}

export interface HNItem {
  title: string;
  url: string;
  hnUrl: string;
  points: number;
  numComments: number;
  createdAt: string;
}

export interface BookmarkRow {
  id: number;
  title: string;
  url: string;
  type: string;
  source: string | null;
  authors: string[];
  year: string | null;
  abstract: string | null;
  institutions: string[];
  affiliationCategory: string | null;
  citationCount: number;
  score: number;
  summary: string | null;
  createdAt: Date;
}

export interface SearchResult {
  papers: PaperItem[];
  news: NewsItem[];
  hn: HNItem[];
  paperWarning: string;
  hnError: string;
}
