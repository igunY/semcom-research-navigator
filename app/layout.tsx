import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { LayoutShell } from "@/components/layout-shell";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Research Navigator",
  description: "SemCom / 6G / AI 業界俯瞰ツール",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
      <body className="h-full flex bg-white text-gray-900 overflow-hidden">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
