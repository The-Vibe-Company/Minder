import type { Metadata } from "next";
import { ListDetail } from "@/components/list-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ListDetail id={id} />;
}

export const metadata: Metadata = { title: "La liste" };
