import type { Metadata } from "next";
import { Swipe } from "@/components/swipe";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Swipe id={id} />;
}

export const metadata: Metadata = { title: "Swiper" };
