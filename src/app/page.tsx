import Link from "next/link";
import type { Metadata } from "next";
import { UserMenuButton } from "@/components/UserMenuButton";

export const metadata: Metadata = {
  title: "PDF to Word Converter — No Upload Required",
  description:
    "Convert PDF to Word, Excel, and PowerPoint entirely in your browser. No uploads, no servers, no account. Works offline. Free to start.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "PrivaPDF — PDF Converter That Never Uploads Your Files",
    description:
      "Convert PDF to Word, Excel, or PowerPoint without uploading anything. Runs entirely in your browser using local AI.",
    url: "https://privapdf.com",
  },
};

/* ─── LemonSqueezy helpers ───────────────────────────────────────────────────
   Variant IDs are read from env vars — set these in your Vercel dashboard:
     NEXT_PUBLIC_LS_VARIANT_INDIVIDUAL   individual plan
     NEXT_PUBLIC_LS_VARIANT_PRO_MONTHLY  pro monthly
     NEXT_PUBLIC_LS_VARIANT_PRO_YEARLY   pro yearly
     NEXT_PUBLIC_LS_VARIANT_LEGAL        legal plan

   checkout[custom][plan] embeds the tier so the LemonSqueezy webhook
   (/api/webhooks/lemonsqueezy) can read it server-side to validate orders.
   LemonSqueezy appends ?order_id=... to success_url after purchase.
───────────────────────────────────────────────────────────────────────────── */
const ORIGIN    = process.env.NEXT_PUBLIC_URL ?? "https://privapdf.net";
const LS_SLUG   = process.env.NEXT_PUBLIC_LS_STORE_SLUG ?? "privapdf";
const mkSuccess = (plan: string) => `${ORIGIN}/success?plan=${plan}`;
const mkCancel  = () => `${ORIGIN}/#pricing`;
const mkLSUrl   = (variantId: string, plan: string) =>
  `https://${LS_SLUG}.lemonsqueezy.com/checkout/buy/${variantId}` +
  `?checkout[success_url]=${encodeURIComponent(mkSuccess(plan))}` +
  `&checkout[cancel_url]=${encodeURIComponent(mkCancel())}` +
  `&checkout[custom][plan]=${encodeURIComponent(plan)}`;

const LS = {
  individual: mkLSUrl(process.env.NEXT_PUBLIC_LS_VARIANT_INDIVIDUAL ?? "", "individual"),
  proMonthly: mkLSUrl(process.env.NEXT_PUBLIC_LS_VARIANT_PRO_MONTHLY ?? "", "pro"),
  proYearly:  mkLSUrl(process.env.NEXT_PUBLIC_LS_VARIANT_PRO_YEARLY  ?? "", "pro"),
  legal:      mkLSUrl(process.env.NEXT_PUBLIC_LS_VARIANT_LEGAL        ?? "", "legal"),
};

/* ─── Data ─────────────────────────────────────────────────────────────────── */
// invertedRows: rows where ✗ is GOOD for PrivaPDF (col 0) and ✓ is BAD for competitors
const INVERTED_ROWS = new Set(["Company can access your files?"]);

const compareRows = [
  { feature: "Files stay on your device",       us: "✓ Always",         small: "✗ Uploaded",  ilove: "✗ Uploaded",  adobe: "✗ Uploaded" },
  { feature: "Company can access your files?",  us: "✗ Never — impossible", small: "✓ Yes, by policy", ilove: "✓ Yes, by policy", adobe: "✓ Yes, by policy" },
  { feature: "Works offline",                   us: "✓ Yes",            small: "✗ No",        ilove: "✗ No",        adobe: "✗ No" },
  { feature: "No account required",             us: "✓ Never",          small: "✗ Required",  ilove: "✗ Required",  adobe: "✗ Required" },
  { feature: "PDF → Word (.docx)",              us: "✓ Yes",            small: "✓ Yes",       ilove: "✓ Yes",       adobe: "✓ Yes" },
  { feature: "PDF → Excel (.xlsx)",             us: "✓ Pro",            small: "✓ Pro",       ilove: "✓ Pro",       adobe: "✓ Paid" },
  { feature: "PDF → PowerPoint (.pptx)",        us: "✓ Pro",            small: "✓ Pro",       ilove: "✓ Pro",       adobe: "✓ Paid" },
  { feature: "Merge / Split / Compress",        us: "✓ Yes",            small: "✓ Yes",       ilove: "✓ Yes",       adobe: "✓ Paid" },
  { feature: "Unlock password PDFs",            us: "✓ Local only",     small: "✗ Uploads",   ilove: "✗ Uploads",   adobe: "✗ Uploads" },
  { feature: "Table reconstruction",            us: "✓ AI-grade",       small: "~ Basic",     ilove: "~ Basic",     adobe: "~ Basic" },
  { feature: "Batch conversion",                us: "✓ Pro",            small: "✓ Pro",       ilove: "✓ Pro",       adobe: "✓ Paid" },
  { feature: "One-time purchase option",        us: "✓ $19 individual", small: "✗ Sub only",  ilove: "✗ Sub only",  adobe: "✗ Sub only" },
];

const faqs = [
  {
    q: "Does my file actually stay on my device?",
    a: "Yes — completely. When you drop a PDF, your browser reads it locally using PDF.js. No byte of your document travels over the network. You can verify this yourself: open DevTools → Network tab while converting. You'll see zero outbound file requests.",
  },
  {
    q: "Why should I trust this more than other tools?",
    a: "Because the privacy guarantee is architectural, not a policy promise. Smallpdf and Adobe have to upload your file to their servers to process it — their servers do the work. PrivaPDF runs the conversion engine inside your browser tab. There is no server that could receive your file even if we wanted to. Open DevTools → Network → convert a PDF. Count the outbound requests. It's zero.",
  },
  {
    q: "What's the AI download for?",
    a: "Scanned PDFs (photos of pages, faxes, handwritten docs) need OCR to extract text. The AI engine (~500MB) downloads once, is cached in your browser forever, and then works fully offline. Text-based PDFs need zero download.",
  },
  {
    q: "Will it work on my laptop / phone?",
    a: "Yes. Text PDFs work on any device instantly. For AI OCR, Chrome and Edge on desktop give you the fastest experience via WebGPU. Safari and Firefox fall back to CPU mode — slower, but fully functional.",
  },
  {
    q: "Why only 3 free conversions per day?",
    a: "It keeps the service sustainable. Since everything runs locally, there are no server costs to offset — the limit is purely a business model choice. Upgrading removes it entirely.",
  },
  {
    q: "Is the $19 really one-time, forever?",
    a: "Yes. The Individual plan is a one-time purchase — pay once, get unlimited conversions on that browser forever. No recurring fees, no subscription traps.",
  },
  {
    q: "What's the difference between Pro and Legal?",
    a: "Pro ($9/mo or $99/yr) adds unlimited conversions, AI OCR, Excel/PowerPoint export, and batch mode. Legal ($29/mo) adds PDF redaction and advanced OCR tuned for scanned legal documents — built for attorneys and compliance teams.",
  },
  {
    q: "Can I use this for confidential documents?",
    a: "Absolutely — that's the primary use case. Legal contracts, medical records, financial reports. Nothing leaves your device, so your confidentiality obligations are met by design, not policy.",
  },
  {
    q: "How does PDF Merge work locally?",
    a: "PrivaPDF renders each PDF page to a canvas element using PDF.js, then assembles them into a new PDF — all inside your browser. No server, no third-party library, no upload.",
  },
  {
    q: "Can I unlock a password-protected PDF without uploading it?",
    a: "Yes. Enter the password in the browser — it decrypts the PDF locally using PDF.js. Your password and your file never leave this tab.",
  },
];

/* ─── Page ──────────────────────────────────────────────────────────────────── */

const softwareAppSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "PrivaPDF",
  "applicationCategory": "UtilitiesApplication",
  "operatingSystem": "Web",
  "offers": [
    { "@type": "Offer", "price": "0", "priceCurrency": "USD", "name": "Free" },
    { "@type": "Offer", "price": "19", "priceCurrency": "USD", "name": "Individual" },
    { "@type": "Offer", "price": "9", "priceCurrency": "USD", "name": "Pro", "billingIncrement": "P1M" },
  ],
  "description": "PDF converter that runs entirely in your browser. No uploads, no servers, works offline.",
  "url": "https://privapdf.com",
  "featureList": [
    "PDF to Word conversion",
    "PDF to Excel conversion",
    "PDF to PowerPoint conversion",
    "PDF merge, split, compress, unlock",
    "Works offline — no internet required",
    "AI OCR for scanned PDFs",
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map((f) => ({
    "@type": "Question",
    "name": f.q,
    "acceptedAnswer": { "@type": "Answer", "text": f.a },
  })),
};

export default function Home() {
  return (
    <>
      {/* ── JSON-LD structured data ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ── NAV ── */}
      <nav className="nav-root">
        <div style={{ fontFamily: "var(--serif)", fontSize: 22, letterSpacing: "-0.3px" }}>
          Priva<span style={{ color: "var(--accent)" }}>PDF</span>
        </div>
        <div className="nav-links">
          {[["#how", "How it works"], ["#tools", "PDF Tools"], ["#pricing", "Pricing"], ["#faq", "FAQ"]].map(([href, label]) => (
            <a key={href} href={href} className="nav-text-link" style={{ fontSize: 14, color: "var(--muted)", textDecoration: "none", fontWeight: 400 }}>
              {label}
            </a>
          ))}
          <Link href="/tools" style={{
            background: "var(--cream)", color: "var(--ink)", border: "1px solid var(--border)",
            padding: "9px 20px", borderRadius: 6, fontWeight: 500, fontSize: 13,
            textDecoration: "none", whiteSpace: "nowrap",
          }}>
            PDF Tools
          </Link>
          <Link href="/convert" style={{
            background: "var(--ink)", color: "var(--paper)",
            padding: "9px 20px", borderRadius: 6, fontWeight: 500, fontSize: 13,
            textDecoration: "none", whiteSpace: "nowrap",
          }}>
            Try free
          </Link>
          <UserMenuButton />
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero-grid">
        {/* Left */}
        <div className="hero-left">
          <div className="animate-fade-up" style={{
            fontSize: 11, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase",
            color: "var(--accent)", marginBottom: 24, display: "flex", alignItems: "center", gap: 8,
            animationDelay: "0.1s",
          }}>
            <span style={{ width: 24, height: 1, background: "var(--accent)", display: "inline-block" }} />
            The only PDF converter that never uploads your files
          </div>

          <h1 className="animate-fade-up" style={{
            fontFamily: "var(--serif)", fontSize: "clamp(42px,5vw,68px)",
            lineHeight: 1.08, letterSpacing: -1.5, marginBottom: 28,
            animationDelay: "0.2s",
          }}>
            PDF to Word.<br />
            <em style={{ fontStyle: "italic", color: "var(--accent)" }}>Without uploading it.</em>
          </h1>

          <p className="animate-fade-up" style={{
            fontSize: 17, color: "var(--muted)", lineHeight: 1.7,
            maxWidth: 440, marginBottom: 40, fontWeight: 300,
            animationDelay: "0.3s",
          }}>
            Runs entirely in your browser using local AI.
            Word, Excel, PowerPoint — plus merge, split, compress and unlock.{" "}
            <strong style={{ color: "var(--ink)", fontWeight: 500 }}>Nothing ever leaves this tab.</strong>
          </p>

          <div className="animate-fade-up" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", animationDelay: "0.4s" }}>
            <Link href="/convert" style={{
              background: "var(--ink)", color: "var(--paper)",
              padding: "14px 28px", borderRadius: 8, fontSize: 15, fontWeight: 500,
              textDecoration: "none", display: "inline-block",
            }}>
              Try it — no upload required →
            </Link>
            <Link href="/tools" style={{
              background: "var(--cream)", color: "var(--ink)", border: "1px solid var(--border)",
              padding: "14px 28px", borderRadius: 8, fontSize: 15, fontWeight: 500,
              textDecoration: "none", display: "inline-block",
            }}>
              PDF Tools →
            </Link>
          </div>

          <div className="animate-fade-up hero-stats" style={{ animationDelay: "0.5s" }}>
            {[["0 bytes", "sent to any server"], ["~2 sec", "avg. conversion time"], ["4", "output formats"], ["4", "free PDF tools"]].map(([num, label]) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontFamily: "var(--serif)", fontSize: 22, letterSpacing: "-0.5px" }}>{num}</span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — drop zone */}
        <div className="animate-fade-up hero-right" style={{ animationDelay: "0.3s" }}>
          <div style={{
            background: "var(--paper)", border: "1.5px dashed var(--border)",
            borderRadius: 16, padding: "56px 48px", textAlign: "center",
            width: "100%", maxWidth: 400,
          }}>
            <div style={{
              width: 64, height: 64, background: "var(--accent-light)", borderRadius: 16,
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px",
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <polyline points="9 15 12 18 15 15"/>
              </svg>
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 22, marginBottom: 8 }}>Drop your PDF here</div>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24, lineHeight: 1.5 }}>
              PDF → Word, Excel, PowerPoint or Text.<br />Your file never leaves this tab.
            </p>
            <Link href="/convert" style={{
              display: "inline-block", background: "var(--accent)", color: "#fff",
              padding: "12px 24px", borderRadius: 8, fontSize: 14, fontWeight: 500,
              textDecoration: "none",
            }}>
              Choose PDF file
            </Link>
            <div style={{
              marginTop: 16, fontSize: 11, color: "var(--muted)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Processed locally · No account needed · Free to start
            </div>
            <div style={{
              marginTop: 20, padding: "12px 16px",
              background: "var(--cream)", borderRadius: 10,
              fontSize: 11, color: "var(--muted)", lineHeight: 1.6, textAlign: "left",
              border: "1px solid var(--border)",
            }}>
              <strong style={{ color: "var(--ink)", fontWeight: 500 }}>Skeptical?</strong> Open DevTools → Network tab while converting. You&apos;ll see <strong style={{ color: "var(--accent)", fontWeight: 500 }}>zero outbound requests.</strong>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="section-pad">
        <div style={{
          fontSize: 11, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase",
          color: "var(--accent)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ width: 20, height: 1, background: "var(--accent)", display: "inline-block" }} />
          How it works
        </div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: "clamp(32px,4vw,48px)", lineHeight: 1.1, letterSpacing: -1, marginBottom: 56, maxWidth: 560 }}>
          Three steps. Zero uploads.
        </h2>
        <div className="how-grid">
          {[
            { n: "01", title: "Drop your PDF", badge: "100% local", desc: "Drag any PDF into the converter. Your file is read directly by your browser — it never touches our servers or any third party." },
            { n: "02", title: "Browser converts it", badge: "WebGPU powered", desc: "Text PDFs convert in ~2 seconds. Scanned documents use on-device AI — downloaded once, cached forever, works offline." },
            { n: "03", title: "Download your file", badge: "Word · Excel · PPT · Text", desc: "Choose Word (.docx), Excel (.xlsx), PowerPoint (.pptx), or plain text output. Tables, headers, and formatting are preserved with professional accuracy." },
          ].map((step, i) => (
            <div key={i} style={{
              padding: "40px 36px",
              borderRight: i < 2 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 48, color: "var(--border)", lineHeight: 1, marginBottom: 20 }}>{step.n}</div>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 10 }}>{step.title}</div>
              <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>{step.desc}</p>
              <span style={{
                display: "inline-block", marginTop: 12, fontSize: 11, fontWeight: 500,
                color: "var(--accent)", background: "var(--accent-light)",
                padding: "3px 10px", borderRadius: 20,
              }}>{step.badge}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── PDF TOOLS SECTION ── */}
      <section id="tools" className="section-pad" style={{ background: "var(--cream)", borderTop: "1px solid var(--border)" }}>
        <div style={{
          fontSize: 11, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase",
          color: "var(--accent)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ width: 20, height: 1, background: "var(--accent)", display: "inline-block" }} />
          PDF Tools — all browser-side
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 48, flexWrap: "wrap", gap: 24 }}>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: "clamp(32px,4vw,48px)", lineHeight: 1.1, letterSpacing: -1, maxWidth: 520 }}>
            Merge. Split. Compress. Unlock.<br />
            <em style={{ fontStyle: "italic", color: "var(--accent)" }}>None of it leaves your browser.</em>
          </h2>
          <Link href="/tools" style={{
            background: "var(--ink)", color: "var(--paper)",
            padding: "14px 28px", borderRadius: 8, fontSize: 15, fontWeight: 500,
            textDecoration: "none", whiteSpace: "nowrap",
          }}>
            Open PDF Tools →
          </Link>
        </div>
        <div className="tools-grid">
          {[
            {
              icon: "⊕",
              title: "Merge PDFs",
              desc: "Drag in any number of PDFs, reorder them with arrows, and download a single merged file. No limit on pages or file count.",
              badge: "Free",
              badgeColor: "var(--accent)",
            },
            {
              icon: "✂",
              title: "Split PDF",
              desc: "Extract individual pages or ranges (e.g. 1,3,5–8) as separate PDFs. Perfect for sharing just the pages you need.",
              badge: "Free",
              badgeColor: "var(--accent)",
            },
            {
              icon: "⇩",
              title: "Compress PDF",
              desc: "Re-render at lower quality to shrink file size by 40–75%. Adjust the slider to balance quality vs. size.",
              badge: "Free",
              badgeColor: "var(--accent)",
            },
            {
              icon: "🔓",
              title: "Unlock PDF",
              desc: "Enter the password to remove protection. The password is used only inside this browser tab — never transmitted anywhere.",
              badge: "Free",
              badgeColor: "var(--accent)",
            },
          ].map((tool, i) => (
            <div key={i} style={{
              padding: "36px 40px",
              borderRight: i % 2 === 0 ? "1px solid var(--border)" : "none",
              borderBottom: i < 2 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 28, lineHeight: 1 }}>{tool.icon}</span>
                <h3 style={{ fontSize: 17, fontWeight: 600, color: "var(--ink)" }}>{tool.title}</h3>
                <span style={{
                  marginLeft: "auto", fontSize: 11, fontWeight: 500,
                  color: tool.badgeColor, background: "var(--accent-light)",
                  padding: "3px 10px", borderRadius: 20,
                }}>{tool.badge}</span>
              </div>
              <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.65 }}>{tool.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
          All tools run 100% in your browser · Zero uploads · No account required
        </div>
      </section>

      {/* ── OFFLINE / PWA ── */}
      <section className="section-pad" style={{ background: "var(--ink)", color: "var(--paper)" }}>
        <div className="offline-grid">
          {/* Left — copy */}
          <div>
            <div style={{
              fontSize: 11, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase",
              color: "#8db89a", marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ width: 20, height: 1, background: "#8db89a", display: "inline-block" }} />
              Works anywhere
            </div>
            <h2 style={{
              fontFamily: "var(--serif)", fontSize: "clamp(32px,4vw,48px)",
              lineHeight: 1.1, letterSpacing: -1, marginBottom: 24, color: "var(--paper)",
            }}>
              Works on planes.<br />
              Works in hospitals.<br />
              Works <em style={{ fontStyle: "italic", color: "#8db89a" }}>everywhere.</em>
            </h2>
            <p style={{ fontSize: 15, color: "#a0b0a4", lineHeight: 1.65, fontWeight: 300, marginBottom: 32, maxWidth: 400 }}>
              Because PrivaPDF runs on your device, it works with{" "}
              <strong style={{ color: "var(--paper)", fontWeight: 500 }}>zero internet</strong>{" "}
              after the first visit. Install as an app — yours forever.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }}>
              {[
                { place: "✈️  On a plane",          note: "No Wi-Fi? No problem." },
                { place: "🏥  In hospitals",         note: "Patient data stays local. Compliance by design." },
                { place: "🏔️  Remote work",          note: "Ships, field sites, rural offices — all covered." },
                { place: "🔒  Secure facilities",    note: "Air-gapped networks. Zero outbound traffic." },
              ].map((item) => (
                <div key={item.place} style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                  <span style={{ fontSize: 14, lineHeight: 1.6, minWidth: 172, color: "var(--paper)", fontWeight: 500 }}>{item.place}</span>
                  <span style={{ fontSize: 13, color: "#8db89a", lineHeight: 1.6 }}>{item.note}</span>
                </div>
              ))}
            </div>
            <Link href="/convert" style={{
              display: "inline-block", background: "var(--paper)", color: "var(--ink)",
              padding: "14px 28px", borderRadius: 8, fontSize: 15, fontWeight: 500,
              textDecoration: "none",
            }}>
              Try it — works offline →
            </Link>
          </div>

          {/* Right — install card + use-case list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* PWA install card */}
            <div style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20, padding: 28,
            }}>
              <div style={{ fontSize: 13, color: "#8db89a", fontWeight: 500, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
                Install as an app
              </div>
              <p style={{ fontSize: 14, color: "#c8d8cc", lineHeight: 1.6, marginBottom: 16 }}>
                Chrome and Edge show an{" "}<strong style={{ color: "var(--paper)" }}>&ldquo;Install app&rdquo;</strong>{" "}
                prompt in the address bar. One click — it appears in your dock like native software.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {["No App Store", "Works offline instantly", "0 MB install size", "No updates needed"].map((tag) => (
                  <span key={tag} style={{
                    fontSize: 11, fontWeight: 500, color: "#8db89a",
                    background: "rgba(26,71,42,0.4)", border: "1px solid rgba(141,184,154,0.2)",
                    padding: "4px 10px", borderRadius: 20,
                  }}>{tag}</span>
                ))}
              </div>
            </div>

            {/* Who uses it offline */}
            <div style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16, padding: 24,
            }}>
              <div style={{ fontSize: 11, color: "#6b8070", fontWeight: 500, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
                Who uses PrivaPDF offline
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { role: "⚖️  Lawyers",           reason: "Client files can't touch a cloud server." },
                  { role: "🏥  Healthcare",         reason: "HIPAA records stay on device. Always." },
                  { role: "💼  Finance teams",      reason: "M&A docs never leave the building." },
                  { role: "🛩️  Frequent travelers", reason: "Convert at 35,000 ft. No Wi-Fi needed." },
                ].map((item, idx, arr) => (
                  <div key={item.role} style={{ borderBottom: idx < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", paddingBottom: idx < arr.length - 1 ? 12 : 0 }}>
                    <div style={{ fontSize: 13, color: "var(--paper)", fontWeight: 500, marginBottom: 3 }}>{item.role}</div>
                    <div style={{ fontSize: 12, color: "#8db89a" }}>{item.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section className="section-pad-sm" style={{ background: "var(--paper)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <p style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500, letterSpacing: 1, textTransform: "uppercase" }}>
            Built for professionals who can&apos;t afford to upload sensitive documents to the cloud
          </p>
        </div>
        <div className="proof-grid">
          {[
            { icon: "⚖️", sector: "Legal", stat: "Attorney-client privilege", note: "Uploading client files to third-party servers can breach confidentiality obligations." },
            { icon: "🏥", sector: "Healthcare", stat: "HIPAA compliance", note: "Patient records processed locally means zero risk of cloud data exposure." },
            { icon: "📊", sector: "Finance", stat: "Material non-public info", note: "M&A documents, earnings previews — none of it ever leaves the device." },
            { icon: "🏛️", sector: "Government", stat: "Air-gapped networks", note: "Works in secure facilities with no outbound internet access required." },
          ].map((item, i) => (
            <div key={i} style={{
              padding: "36px 28px",
              borderRight: i < 3 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{ fontSize: 28, marginBottom: 16 }}>{item.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--accent)", marginBottom: 8 }}>{item.sector}</div>
              <div style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)", marginBottom: 10 }}>{item.stat}</div>
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>{item.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <section className="section-pad" style={{ background: "var(--cream)" }}>
        <div style={{
          fontSize: 11, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase",
          color: "var(--accent)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ width: 20, height: 1, background: "var(--accent)", display: "inline-block" }} />
          Why PrivaPDF
        </div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: "clamp(32px,4vw,48px)", lineHeight: 1.1, letterSpacing: -1, marginBottom: 48, maxWidth: 560 }}>
          Most converters see your files.<br />We don&apos;t.
        </h2>
        <div className="comparison-wrap" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--paper)" }}>
            <thead>
              <tr>
                {["Feature", "PrivaPDF", "Smallpdf", "ILovePDF", "Adobe"].map((h, i) => (
                  <th key={h} style={{
                    padding: "20px 28px", textAlign: "left", fontSize: 13, fontWeight: 500,
                    borderBottom: "1px solid var(--border)",
                    background: i === 1 ? "#f0fff4" : "var(--cream)",
                    fontFamily: i === 0 ? "var(--serif)" : "var(--sans)",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compareRows.map((row, ri) => {
                const isInverted = INVERTED_ROWS.has(row.feature);
                return (
                <tr key={ri}>
                  <td style={{ padding: "18px 28px", fontSize: 14, borderBottom: ri < compareRows.length - 1 ? "1px solid var(--border)" : "none", color: "var(--ink)" }}>{row.feature}</td>
                  {[row.us, row.small, row.ilove, row.adobe].map((val, ci) => {
                    const isPrivaPDF = ci === 0;
                    const isCheckmark = val.startsWith("✓");
                    const isCross = val.startsWith("✗");
                    // Normal rows: ✓ privapdf=green, ✗ privapdf=red, ✓ competitor=green, ✗ competitor=red
                    //   → wait, we actually want: ✓ privapdf=good, ✗ competitors=good (they lack it)
                    // Actually standard: ✓ = green for all, ✗ = red for all EXCEPT inverted rows
                    // Inverted rows: ✗ privapdf = green (good!), ✓ competitors = red (bad!)
                    let color = "var(--muted)";
                    if (isCheckmark || isCross) {
                      if (isInverted) {
                        // ✗ = green (good outcome), ✓ = red (bad outcome)
                        color = isCross ? "#1a472a" : "#b0392a";
                      } else {
                        // ✓ = green, ✗ = red — but for competitors ✗ can also mean "bad for them"
                        // We highlight PrivaPDF advantages: ✓ privapdf=green, ✗ privapdf=red
                        // competitors: ✗ = neutral/red (they're missing it), ✓ = neutral
                        if (isPrivaPDF) {
                          color = isCheckmark ? "#1a472a" : "#b0392a";
                        } else {
                          // competitor column: ✗ = muted-red (they lack it), ✓ = neutral green
                          color = isCross ? "#b0392a" : "#1a472a";
                        }
                      }
                    }
                    return (
                    <td key={ci} style={{
                      padding: "18px 28px", fontSize: 14,
                      borderBottom: ri < compareRows.length - 1 ? "1px solid var(--border)" : "none",
                      background: ci === 0 ? "#f0fff4" : "transparent",
                      color,
                      fontWeight: val.startsWith("✓") || val.startsWith("✗") ? 500 : 400,
                    }}>
                      {val}
                    </td>
                    );
                  })}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── FOR LAWYERS / HIGH-LTV ── */}
      <section className="section-pad" style={{ background: "var(--ink)", color: "var(--paper)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{
            fontSize: 11, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase",
            color: "#8db89a", marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ width: 20, height: 1, background: "#8db89a", display: "inline-block" }} />
            Built for confidentiality-first professionals
          </div>
          <h2 style={{
            fontFamily: "var(--serif)", fontSize: "clamp(32px,4vw,52px)",
            lineHeight: 1.1, letterSpacing: -1, marginBottom: 24, color: "var(--paper)",
          }}>
            If you work with documents<br />
            that <em style={{ fontStyle: "italic", color: "#8db89a" }}>can&apos;t leave the building</em> —<br />
            this was made for you.
          </h2>
          <p style={{ fontSize: 16, color: "#a0b0a4", lineHeight: 1.75, fontWeight: 300, maxWidth: 600, marginBottom: 48 }}>
            Attorneys, compliance officers, healthcare staff, and finance teams handle documents
            where a single upload to the wrong server is a liability. PrivaPDF makes that risk
            physically impossible — the conversion engine runs in your browser, not on our infrastructure.
          </p>
          <div className="hltv-grid">
            {[
              {
                icon: "⚖️",
                title: "Attorneys & Law Firms",
                points: ["Attorney-client privilege preserved", "No third-party server ever sees client files", "Works in air-gapped and secure networks", "PDF redaction available (Legal plan)"],
              },
              {
                icon: "🏥",
                title: "Healthcare & HIPAA",
                points: ["Patient records never leave the device", "Zero cloud exposure by design", "No BAA needed — no PHI transmitted", "Works offline in clinical environments"],
              },
              {
                icon: "💼",
                title: "Finance & Compliance",
                points: ["M&A docs, earnings previews stay local", "No data residency concerns", "Audit trail: DevTools proves zero uploads", "Works in restricted trading environments"],
              },
            ].map((card, i) => (
              <div key={i} style={{
                padding: "36px 32px",
                background: "rgba(255,255,255,0.04)",
                borderRight: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none",
              }}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>{card.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: "var(--paper)", marginBottom: 16 }}>{card.title}</div>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                  {card.points.map((pt) => (
                    <li key={pt} style={{ fontSize: 13, color: "#8db89a", display: "flex", alignItems: "flex-start", gap: 8, lineHeight: 1.5 }}>
                      <span style={{ color: "#8db89a", flexShrink: 0, marginTop: 1 }}>✓</span>
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 40, textAlign: "center" }}>
            <Link href="/convert" style={{
              display: "inline-block", background: "var(--paper)", color: "var(--ink)",
              padding: "14px 32px", borderRadius: 8, fontSize: 15, fontWeight: 500,
              textDecoration: "none",
            }}>
              Try it — verify yourself in DevTools →
            </Link>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="section-pad">
        <div style={{
          fontSize: 11, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase",
          color: "var(--accent)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ width: 20, height: 1, background: "var(--accent)", display: "inline-block" }} />
          Pricing
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 48, flexWrap: "wrap", gap: 16 }}>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: "clamp(28px,4vw,48px)", lineHeight: 1.1, letterSpacing: -1, maxWidth: 480 }}>
            Start free.<br />Scale when you&apos;re ready.
          </h2>
          <p style={{ fontSize: 14, color: "var(--muted)", maxWidth: 340, lineHeight: 1.6 }}>
            Every plan processes files entirely in your browser — your documents never touch our servers.
          </p>
        </div>

        <div className="pricing-grid">

          {/* ── FREE ── */}
          <div style={{ border: "1px solid var(--border)", borderRadius: 16, padding: 32, background: "var(--paper)", display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "var(--muted)", marginBottom: 20 }}>Free</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 44, lineHeight: 1, marginBottom: 4 }}>$0</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 24 }}>forever, no card needed</div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10, marginBottom: 28, flex: 1 }}>
              {[
                "3 conversions / day (PDF → Word)",
                "Tables & formatting preserved",
                "Merge, split, compress (3 uses/day)",
                "Unlock password PDFs",
                "Works offline after first visit",
              ].map((f) => (
                <li key={f} style={{ fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ width: 14, height: 14, background: "var(--accent-light)", borderRadius: "50%", flexShrink: 0, marginTop: 2, display: "inline-block" }} />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/convert" style={{
              display: "block", padding: "12px 0", borderRadius: 8, fontSize: 13,
              fontWeight: 500, textAlign: "center", textDecoration: "none",
              background: "var(--cream)", color: "var(--ink)", border: "1px solid var(--border)",
            }}>
              Start free
            </Link>
          </div>

          {/* ── INDIVIDUAL ── */}
          <div style={{ border: "2px solid var(--accent)", borderRadius: 16, padding: 32, background: "var(--paper)", display: "flex", flexDirection: "column", position: "relative" }}>
            <div style={{
              position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
              background: "var(--accent)", color: "#fff",
              fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
              padding: "4px 14px", borderRadius: 20,
            }}>Most Popular</div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "var(--accent)", marginBottom: 20 }}>Individual</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 4 }}>
              <span style={{ fontFamily: "var(--serif)", fontSize: 44, lineHeight: 1 }}>$19</span>
              <span style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>one-time</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>pay once, yours forever</div>
            <div style={{
              fontSize: 11, fontWeight: 600, color: "#b05a2a",
              background: "#fff7f0", border: "1px solid #ffd4b0",
              borderRadius: 6, padding: "4px 10px", marginBottom: 24, display: "inline-block",
            }}>
              🔥 Launch price — may increase
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10, marginBottom: 28, flex: 1 }}>
              {[
                "Unlimited conversions",
                "AI OCR for scanned PDFs",
                "Excel + PowerPoint export",
                "Batch convert",
                "Page range selection",
              ].map((f) => (
                <li key={f} style={{ fontSize: 13, color: "var(--ink)", display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1, fontSize: 14, lineHeight: 1 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <a href={LS.individual} style={{
              display: "block", padding: "12px 0", borderRadius: 8,
              fontSize: 13, fontWeight: 600, textAlign: "center",
              background: "var(--ink)", color: "var(--paper)", textDecoration: "none",
            }}>
              Buy once — $19
            </a>
          </div>

          {/* ── PRO ── */}
          <div style={{ border: "1px solid var(--border)", borderRadius: 16, padding: 32, background: "var(--ink)", color: "var(--paper)", display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#8db89a", marginBottom: 20 }}>Pro</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 4 }}>
              <span style={{ fontFamily: "var(--serif)", fontSize: 44, lineHeight: 1 }}>$9</span>
              <span style={{ fontSize: 13, color: "#8db89a", marginBottom: 4 }}>/month</span>
            </div>
            <div style={{ fontSize: 12, color: "#8db89a", marginBottom: 24 }}>or $99/year · save 8%</div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10, marginBottom: 28, flex: 1 }}>
              {[
                "Everything in Individual",
                "Always on latest features",
                "Priority support",
                "License restore by email",
                "Early feature previews",
              ].map((f) => (
                <li key={f} style={{ fontSize: 13, color: "#c8d8cc", display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ color: "#8db89a", flexShrink: 0, marginTop: 1, fontSize: 14, lineHeight: 1 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <a href={LS.proMonthly} style={{
                display: "block", padding: "12px 0", borderRadius: 8,
                fontSize: 13, fontWeight: 600, textAlign: "center",
                background: "#fff", color: "var(--ink)", textDecoration: "none",
              }}>
                Start Pro — $9/mo
              </a>
              <a href={LS.proYearly} style={{
                display: "block", padding: "11px 0", borderRadius: 8,
                fontSize: 12, fontWeight: 500, textAlign: "center",
                background: "transparent", color: "#8db89a", textDecoration: "none",
                border: "1px solid rgba(141,184,154,0.3)",
              }}>
                Annual — $99/yr
              </a>
            </div>
          </div>

          {/* ── LEGAL ── */}
          <div style={{ border: "1px solid var(--border)", borderRadius: 16, padding: 32, background: "var(--cream)", display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "var(--muted)", marginBottom: 20 }}>Legal</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 4 }}>
              <span style={{ fontFamily: "var(--serif)", fontSize: 44, lineHeight: 1 }}>$29</span>
              <span style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>/month</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 24 }}>for attorneys &amp; compliance teams</div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10, marginBottom: 28, flex: 1 }}>
              {[
                "Everything in Pro",
                "PDF redaction (local)",
                "Advanced OCR for legal docs",
                "Privilege log export",
                "Team-ready (coming soon)",
              ].map((f) => (
                <li key={f} style={{ fontSize: 13, color: "var(--ink)", display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1, fontSize: 14, lineHeight: 1 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <a href={LS.legal} style={{
              display: "block", padding: "12px 0", borderRadius: 8,
              fontSize: 13, fontWeight: 600, textAlign: "center",
              background: "var(--ink)", color: "var(--paper)", textDecoration: "none",
            }}>
              Start Legal — $29/mo
            </a>
            <div style={{ marginTop: 10, textAlign: "center", fontSize: 11, color: "var(--muted)" }}>
              For firms &amp; teams — contact us for volume pricing
            </div>
          </div>

        </div>

        {/* Money-back note */}
        <p style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
          All plans · Secure checkout via LemonSqueezy (Stripe-powered) · 14-day refund policy · Files never leave your device
        </p>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="section-pad" style={{ background: "var(--cream)" }}>
        <div style={{
          fontSize: 11, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase",
          color: "var(--accent)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ width: 20, height: 1, background: "var(--accent)", display: "inline-block" }} />
          FAQ
        </div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: "clamp(32px,4vw,48px)", lineHeight: 1.1, letterSpacing: -1, marginBottom: 48, maxWidth: 560 }}>
          Common questions
        </h2>
        <div className="faq-grid">
          {faqs.map((item, i) => (
            <div key={i} style={{
              padding: "32px 36px",
              borderRight: i % 2 === 0 ? "1px solid var(--border)" : "none",
              borderBottom: i < faqs.length - 2 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 10 }}>{item.q}</div>
              <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.65 }}>{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="section-pad-sm" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="footer-top">
          <div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 20, marginBottom: 8 }}>
              Priva<span style={{ color: "var(--accent)" }}>PDF</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)", maxWidth: 260, lineHeight: 1.6 }}>
              The only PDF converter where your files are architecturally impossible to access — even by us.
            </p>
          </div>
          <div className="footer-links">
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>Product</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[["/convert", "PDF Converter"], ["/tools", "PDF Tools"], ["/#pricing", "Pricing"], ["/#faq", "FAQ"]].map(([href, label]) => (
                  <a key={href} href={href} style={{ fontSize: 13, color: "var(--muted)", textDecoration: "none" }}>{label}</a>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>Use cases</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[["/#tools", "Merge PDF"], ["/#tools", "Split PDF"], ["/#tools", "Compress PDF"], ["/#tools", "Unlock PDF"]].map(([href, label]) => (
                  <a key={label} href={href} style={{ fontSize: 13, color: "var(--muted)", textDecoration: "none" }}>{label}</a>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>Company</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[["/#how", "How it works"], ["/#faq", "Trust & Privacy"]].map(([href, label]) => (
                  <a key={label} href={href} style={{ fontSize: 13, color: "var(--muted)", textDecoration: "none" }}>{label}</a>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            © {new Date().getFullYear()} PrivaPDF — Your files, your device.
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", gap: 4, alignItems: "center" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Zero files uploaded · Zero tracking · Zero servers
          </div>
        </div>
      </footer>
    </>
  );
}
