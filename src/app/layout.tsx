import { configuredSiteOrigin } from "@/lib/site-origin";
import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/toast";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});
const body = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: configuredSiteOrigin() ? new URL(configuredSiteOrigin()!) : undefined,
  title: {
    default: "Minder — on se partage les objets de la maison",
    template: "%s · Minder",
  },
  description:
    "La maison est vendue : Muriel photographie les objets, la famille dit « je le veux » ou « non merci », et chacun repart avec ce qui compte.",
  openGraph: {
    title: "Minder — on se partage les objets de la maison",
    description:
      "Muriel photographie les objets, la famille swipe, et chacun repart avec ce qui compte.",
    locale: "fr_FR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#2343a6",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${display.variable} ${body.variable}`}>
      <body>
        <a
          href="#contenu"
          className="sr-only z-50 rounded-full bg-citron px-5 py-3 font-bold text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Aller au contenu
        </a>
        <Suspense fallback={null}>{children}</Suspense>
        <Toaster />
      </body>
    </html>
  );
}
