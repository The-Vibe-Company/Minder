import type { Metadata } from "next";
import { Search } from "@/components/search";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Search id={id} />;
}

export const metadata: Metadata = { title: "Rechercher" };
