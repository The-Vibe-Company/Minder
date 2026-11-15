import { Login } from "@/components/login";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return <Login invalidLink={Boolean(error)} next={next || "/lists"} />;
}
