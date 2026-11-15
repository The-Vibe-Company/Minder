import type { Metadata } from "next";
import { Recap } from "@/components/recap";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Recap id={id} />;
}

export const metadata: Metadata = { title: "Récapitulatif" };
