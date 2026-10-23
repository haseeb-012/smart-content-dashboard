// Public config only. The browser never gets the Supabase secret/service key, DB URL or provider keys.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// New Supabase projects call it the "publishable" key; older ones the "anon" key. Either works here.
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

/** Live mode = real Supabase login + FastAPI backend. Otherwise the app runs as a local demo. */
export const LIVE = Boolean(SUPABASE_URL && SUPABASE_KEY && API_URL);
export const AUTH_ENABLED = Boolean(SUPABASE_URL && SUPABASE_KEY);
