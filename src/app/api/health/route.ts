import { connection } from "next/server";
// Cache Components rejects dynamic="force-dynamic"; opt into request-time execution.
export async function GET() {
  await connection();
  return Response.json({
    ok: true,
    supabase: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
    openai: Boolean(process.env.OPENAI_API_KEY),
  });
}
