import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import type { PaperItem, NewsItem, HNItem } from "@/types";

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");
  const where = type ? { type } : undefined;

  const bookmarks = await prisma.bookmark.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return Response.json(bookmarks);
}

export async function POST(request: NextRequest) {
  const { item, type, summary = "" } = await request.json() as {
    item: (PaperItem | NewsItem | HNItem) & Record<string, unknown>;
    type: string;
    summary?: string;
  };

  const url = (item.url as string) ?? "";
  if (!url) return Response.json({ error: "url required" }, { status: 400 });

  try {
    const bookmark = await prisma.bookmark.create({
      data: {
        title: (item.title as string) ?? "",
        url,
        type,
        source: (item.source as string) ?? null,
        authors: Array.isArray(item.authors) ? (item.authors as string[]) : [],
        year: (item.year as string) ?? null,
        abstract: (item.abstract as string) ?? null,
        institutions: Array.isArray(item.institutions) ? (item.institutions as string[]) : [],
        affiliationCategory: (item.affiliationCategory as string) ?? null,
        citationCount: (item.citationCount as number) ?? 0,
        score: (item.score as number) ?? (item.points as number) ?? 0,
        summary: summary || null,
      },
    });
    return Response.json(bookmark, { status: 201 });
  } catch {
    return Response.json({ error: "already saved" }, { status: 409 });
  }
}
