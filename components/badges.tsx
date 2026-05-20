import React from "react";

const AFF_COLORS: Record<string, string> = {
  Academic: "#1a73e8",
  Corporate: "#e37400",
  Mixed: "#7b1fa2",
  Unknown: "#888888",
};
const AFF_EMOJI: Record<string, string> = {
  Academic: "🎓",
  Corporate: "🏢",
  Mixed: "🔀",
  Unknown: "❓",
};

function Badge({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold text-white mr-1 mb-1"
      style={{ backgroundColor: bg }}
    >
      {children}
    </span>
  );
}

export function AffBadge({ category }: { category: string }) {
  const cat = category in AFF_COLORS ? category : "Unknown";
  return (
    <Badge bg={AFF_COLORS[cat]}>
      {AFF_EMOJI[cat]} {cat}
    </Badge>
  );
}

export function SourceBadge({ source }: { source: string }) {
  const bg = source === "OpenAlex" ? "#1d6340" : "#b31217";
  return <Badge bg={bg}>{source}</Badge>;
}

export function CitationBadge({ count }: { count: number }) {
  if (!count) return null;
  return <Badge bg="#1d6340">📊 引用 {count.toLocaleString()}</Badge>;
}

export function ScoreBadge({ points }: { points: number }) {
  const bg = points >= 100 ? "#ff6600" : "#888888";
  return <Badge bg={bg}>▲ {points} pts</Badge>;
}

export function CommentBadge({ count }: { count: number }) {
  const bg = count >= 50 ? "#1a73e8" : "#888888";
  return <Badge bg={bg}>💬 {count}</Badge>;
}

export function OaBadge() {
  return <Badge bg="#2e7d32">🔓 Open Access</Badge>;
}

export function TopicBadge({ topic }: { topic: string }) {
  return <Badge bg="#0d47a1">🏷️ {topic}</Badge>;
}
