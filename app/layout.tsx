import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "NexTask",
  description: "Next-generation BPM case manager.",
};

// Pre-paint theme bootstrap: applies the persisted (or OS) light/dark class to
// <html> before first paint. Rendered as a real executable script on the server
// so it runs during HTML parsing; re-rendered inert (text/plain) in React's
// client render, which is what keeps dev mode from warning about <script> tags
// inside components (see next/dist/docs "Preventing Flash Before Hydration").
// suppressHydrationWarning covers the type attribute swap.
function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <InlineScript
          html={`(function(){try{var t=localStorage.getItem("theme");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.add(d?"dark":"light");document.documentElement.style.colorScheme=d?"dark":"light"}catch(e){}})();`}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
