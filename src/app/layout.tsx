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
  metadataBase: new URL("https://privapdf.com"),
  title: {
    default: "PrivaPDF — PDF Converter That Never Uploads Your Files",
    template: "%s | PrivaPDF",
  },
  description:
    "Convert PDF to Word, Excel, or PowerPoint without uploading anything. Runs entirely in your browser using local AI. Zero servers, zero accounts, works offline.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PrivaPDF — PDF Converter That Never Uploads Your Files",
    description:
      "Zero uploads. Zero servers. Works offline. Your files are processed entirely in your browser — not ours.",
    type: "website",
    url: "https://privapdf.com",
    siteName: "PrivaPDF",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PrivaPDF — Convert PDFs without uploading them",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PrivaPDF — PDF Converter That Never Uploads Your Files",
    description:
      "Zero uploads. Runs in your browser. Works offline. Your files never leave your device.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
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
