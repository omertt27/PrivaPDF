import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PDF to Word Converter — Free, Private, No Upload",
  description:
    "Convert PDF to Word (.docx), Excel (.xlsx), or PowerPoint (.pptx) free. Your file never leaves your browser. No account, no upload, works offline.",
  alternates: { canonical: "/convert" },
  openGraph: {
    title: "PDF to Word Converter — No Upload Required | PrivaPDF",
    description:
      "Free PDF converter that runs entirely in your browser. Zero uploads. Works offline. Convert to Word, Excel, or PowerPoint.",
    url: "https://privapdf.com/convert",
  },
};

export default function ConvertLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
