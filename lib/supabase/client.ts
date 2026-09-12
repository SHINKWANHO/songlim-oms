import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const rawSupabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!rawSupabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL이 없습니다."
    );
  }

  if (!supabaseKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY가 없습니다."
    );
  }

  // 운영 HTTPS 페이지에서 HTTP Supabase 호출 방지
  const supabaseUrl = rawSupabaseUrl
    .trim()
    .replace(/^http:\/\//i, "https://")
    .replace(/\/+$/, "");

  return createBrowserClient(
    supabaseUrl,
    supabaseKey
  );
}