import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/config";

/** Server-side Supabase client for route handlers (e.g. the auth callback). */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        for (const { name, value, options } of list) store.set(name, value, options);
      },
    },
  });
}
