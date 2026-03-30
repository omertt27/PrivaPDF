import type { Metadata } from "next";
import { Instrument_Serif, DM_Sans } from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "PrivaPDF — PDF Converter That Never Sees Your Files",
  description:
    "Convert PDF to Word in seconds. No uploads, no accounts, no servers. Your documents are processed entirely in your browser using local AI.",
  keywords: "PDF to Word, PDF converter, privacy, local, offline, no upload",
  openGraph: {
    title: "PrivaPDF — PDF Converter That Never Sees Your Files",
    description: "Convert PDF to Word in seconds. Zero uploads. 100% private.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${dmSans.variable}`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
