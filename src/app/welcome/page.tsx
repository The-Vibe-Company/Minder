import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { Welcome } from "@/components/welcome";

export const metadata: Metadata = {
  title: "Bienvenue",
  robots: { index: false, follow: false },
};

type Search = Promise<{ next?: string; change?: string }>;

async function WelcomeFromLink({ searchParams }: { searchParams: Search }) {
  const { next, change } = await searchParams;
  return <Welcome next={next || "/lists"} change={change === "1"} />;
}

export default function Page({ searchParams }: { searchParams: Search }) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<Welcome next="/lists" />}>
        <WelcomeFromLink searchParams={searchParams} />
      </Suspense>
    </>
  );
}
