"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/config";

let client: SupabaseClient | null = null;

/** Browser Supabase client (PKCE flow, session in cookies so the server/proxy can read it). */
export function supabaseBrowser(): SupabaseClient {
  if (!client) client = createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
  return client;
}
