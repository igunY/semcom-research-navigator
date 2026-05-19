import { NextRequest } from "next/server";
import { fetchPapers } from "@/lib/collectors/papers";
import { fetchNews } from "@/lib/collectors/news";
import { fetchHN } from "@/lib/collectors/hacker-news";

export async function POST(request: NextRequest) {
  const { keyword, maxResults = 8, wildcardKeyword } = await request.json();

  if (!keyword?.trim()) {
    return Response.json({ error: "keyword required" }, { status: 400 });
  }

  const [papersResult, newsResult, hnResult, wcResult] = await Promise.allSettled([
    fetchPapers(keyword, maxResults),
    fetchNews(keyword, maxResults),
    fetchHN(keyword, 30),
    wildcardKeyword ? fetchNews(wildcardKeyword, maxResults) : Promise.resolve([]),
  ]);

  return Response.json({
    papers: papersResult.status === "fulfilled" ? papersResult.value.items : [],
    paperWarning: papersResult.status === "fulfilled" ? papersResult.value.warning : String((papersResult as PromiseRejectedResult).reason),
    news: newsResult.status === "fulfilled" ? newsResult.value : [],
    hn: hnResult.status === "fulfilled" ? hnResult.value : [],
    hnError: hnResult.status === "rejected" ? String((hnResult as PromiseRejectedResult).reason) : "",
    wildcardNews: wcResult.status === "fulfilled" ? wcResult.value : [],
  });
}
