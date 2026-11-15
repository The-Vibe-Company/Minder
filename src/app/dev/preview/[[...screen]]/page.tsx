import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Preview } from "@/components/dev/preview";
import { SCREENS, type Screen } from "@/components/dev/screens";

// Development-only: fake data to look at the screens behind sign-in.
// Production builds answer 404 here.
export const metadata: Metadata = {
  title: "Aperçu",
  robots: { index: false, follow: false },
};

type Params = Promise<{ screen?: string[] }>;

async function Screen({ params }: { params: Params }) {
  const { screen } = await params;
  const name = screen?.[0];
  const known = screen?.length === 1 && name && name in SCREENS;
  return (
    <Preview
      key={known ? name : "index"}
      screen={known ? (name as Screen) : null}
    />
  );
}

export default function Page({ params }: { params: Params }) {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense fallback={null}>
      <Screen params={params} />
    </Suspense>
  );
}
