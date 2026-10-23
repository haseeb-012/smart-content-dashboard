import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** PKCE callback for OAuth (Google/Apple), email confirmation and password-reset links. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";
  // Only allow same-site relative redirects.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
  }
  const fail = new URL("/login", url.origin);
  fail.searchParams.set("error", "That sign-in link is invalid or expired. Please try again.");
  return NextResponse.redirect(fail);
}
