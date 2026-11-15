import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Likes, LikesSkeleton } from "@/components/likes";
import { UserNav } from "@/components/me";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Mes likes" };

// Signed out: sign in first. Not onboarded yet: the first name first.
async function Guard({ children }: { children: React.ReactNode }) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
    redirect("/login?next=/likes");
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login?next=/likes");
  const { data: profile } = await db
    .from("profiles")
    .select("onboarded_at")
    .eq("id", user.id)
    .maybeSingle();
  if (profile && !profile.onboarded_at) redirect("/welcome?next=/likes");
  return children;
}

export default function Page() {
  return (
    <>
      <SiteHeader>
        <UserNav />
      </SiteHeader>
      <main id="contenu">
        <Suspense fallback={<LikesSkeleton />}>
          <Guard>
            <Likes />
          </Guard>
        </Suspense>
      </main>
    </>
  );
}
