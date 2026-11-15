import { Login } from "@/components/login";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <Login next={next || "/lists"} />;
}
