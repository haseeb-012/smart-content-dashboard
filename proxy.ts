import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ENABLED, SUPABASE_KEY, SUPABASE_URL } from "@/lib/config";

const PUBLIC = ["/login", "/signup", "/forgot-password", "/reset-password", "/auth/callback"];

/**
 * Refreshes the Supabase session cookie on every request and sends signed-out users to /login.
 * This is an optimistic check for UX only — the FastAPI backend verifies every token itself.
 */
export async function proxy(request: NextRequest) {
  if (!AUTH_ENABLED) return NextResponse.next(); // demo mode

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  // getClaims() validates the JWT signature against the project's JWKS.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(`${p}/`));

  if (!signedIn && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  if (signedIn && (path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    const plan = request.nextUrl.searchParams.get("plan");
    const cycle = request.nextUrl.searchParams.get("cycle") ?? "monthly";
    url.pathname = plan ? "/settings" : "/dashboard";
    url.search = plan ? `?tab=Subscription&plan=${encodeURIComponent(plan)}&cycle=${encodeURIComponent(cycle)}` : "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|webp|ico)$).*)"],
};
