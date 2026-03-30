import type { Metadata } from "next";
import { Instrument_Serif, DM_Sans } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

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
    "Convert PDF to Word in seconds. No uploads, no accounts, no servers. Works offline. Your documents are processed entirely in your browser using local AI.",
  keywords: "PDF to Word, PDF converter, privacy, local, offline, no upload, offline pdf converter, pdf to word without internet",
  openGraph: {
    title: "PrivaPDF — PDF Converter That Never Sees Your Files",
    description: "Convert PDF to Word in seconds. Zero uploads. Works offline. 100% private.",
    type: "website",
  },
  manifest: "/manifest.json",
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "PrivaPDF",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${dmSans.variable}`}>
      <head>
        <meta name="theme-color" content="#1a472a" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-full">
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
