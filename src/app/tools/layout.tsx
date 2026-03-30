import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free PDF Tools — Merge, Split, Compress & Unlock PDFs",
  description:
    "Merge multiple PDFs, split by page, compress file size, and unlock password-protected PDFs — all in your browser. Zero uploads. Free to use.",
  alternates: { canonical: "/tools" },
  openGraph: {
    title: "Free PDF Tools — Merge, Split, Compress & Unlock | PrivaPDF",
    description:
      "Merge, split, compress, and unlock PDFs entirely in your browser. No uploads, no account needed. 100% private.",
    url: "https://privapdf.com/tools",
  },
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
