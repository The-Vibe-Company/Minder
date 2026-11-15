import type { Metadata } from "next";
import { Invite } from "@/components/invite";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Une invitation en famille",
  description:
    "On vous garde une place à table : dites quels objets de la maison vous aimeriez garder.",
};

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <>
      <SiteHeader />
      <Invite token={token} />
    </>
  );
}
