import { Suspense } from "react";
import type { Metadata } from "next";
import { Login } from "@/components/login";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Recevez un lien de connexion par e-mail pour rejoindre Minder.",
};

type Search = Promise<{ next?: string; error?: string }>;

async function LoginFromLink({ searchParams }: { searchParams: Search }) {
  const { next, error } = await searchParams;
  return <Login invalidLink={Boolean(error)} next={next || "/lists"} />;
}

export default function Page({ searchParams }: { searchParams: Search }) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<Login next="/lists" />}>
        <LoginFromLink searchParams={searchParams} />
      </Suspense>
    </>
  );
}
