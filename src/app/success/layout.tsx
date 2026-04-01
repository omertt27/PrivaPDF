import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plan Activated — Welcome to PrivaPDF",
  description:
    "Your PrivaPDF plan is now active. Unlimited PDF conversions, AI OCR, and more — entirely in your browser.",
  robots: { index: false, follow: false },
};

export default function SuccessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
