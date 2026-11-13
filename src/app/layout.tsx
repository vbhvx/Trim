import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trim | AI & SaaS Spend Intelligence and Cost Optimization",
  description:
    "Evidence-based cost intelligence, SaaS subscription management, seat utilization, duplicate detection, invoice reconciliation, and verified savings tracking.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}

