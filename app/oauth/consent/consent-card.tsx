"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertCircle, Check, ShieldCheck } from "lucide-react";
import { LogoMark } from "@/components/shell/logo";
import { Button, Skeleton } from "@/components/ui";
import { AUTH_ENABLED } from "@/lib/config";
import { supabaseBrowser } from "@/lib/supabase/client";

type Details = { authorization_id: string; redirect_uri: string; scope: string; client: { name: string; uri: string; logo_uri: string }; user: { email: string } };

const SCOPE_TEXT: Record<string, string> = {
  openid: "Confirm who you are",
  email: "See your email address",
  profile: "See your name",
};

/**
 * OAuth consent screen for Supabase Auth's OAuth 2.1 server (used by MCP clients such as Claude).
 * Supabase sends the user here with ?authorization_id=…; the proxy makes sure they're signed in first.
 */
export function ConsentCard() {
  const params = useSearchParams();
  const id = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<Details | null>(null);
  const [error, setError] = useState<string | null>(AUTH_ENABLED ? (id ? null : "This link is missing its authorization ID. Start again from your assistant.") : "Sign-in isn't configured for this app.");
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);

  useEffect(() => {
    if (!id || !AUTH_ENABLED) return;
    let alive = true;
    supabaseBrowser().auth.oauth.getAuthorizationDetails(id).then(({ data, error: e }) => {
      if (!alive) return;
      if (e || !data) return setError(e?.message ?? "This request has expired. Start again from your assistant.");
      if ("redirect_url" in data) return window.location.assign(data.redirect_url); // already approved before
      setDetails(data as Details);
    });
    return () => { alive = false; };
  }, [id]);

  const decide = async (approve: boolean) => {
    setBusy(approve ? "approve" : "deny");
    const oauth = supabaseBrowser().auth.oauth;
    const { data, error: e } = approve
      ? await oauth.approveAuthorization(id, { skipBrowserRedirect: true })
      : await oauth.denyAuthorization(id, { skipBrowserRedirect: true });
    if (e || !data) { setBusy(null); setError(e?.message ?? "Something went wrong. Try again from your assistant."); return; }
    window.location.assign(data.redirect_url);
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-2"><LogoMark /><span className="font-display text-lg font-medium">Smart Content</span></div>
        {error ? (
          <div role="alert" className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-danger">
            <AlertCircle className="mt-0.5 size-4 flex-none" /><p>{error}</p>
          </div>
        ) : !details ? (
          <div className="mt-6 space-y-3" aria-busy="true"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-24 w-full" /><Skeleton className="h-10 w-full" /></div>
        ) : (
          <>
            <h1 className="mt-6 font-display text-xl font-medium leading-7">
              <span className="font-semibold">{details.client.name || "An app"}</span> wants to use your Smart Content account
            </h1>
            <p className="mt-1 text-sm text-muted">Signed in as {details.user.email}</p>
            <div className="mt-5 rounded-xl border border-line bg-surface-2 p-4 text-sm">
              <p className="mb-2 flex items-center gap-1.5 font-semibold"><ShieldCheck className="size-4 text-accent" /> It will be able to:</p>
              <ul className="space-y-1.5">
                <li className="flex gap-2"><Check className="mt-0.5 size-4 flex-none text-good" />Read your workspaces: tracked creators, outlier videos, analyses, ideas and hooks</li>
                <li className="flex gap-2"><Check className="mt-0.5 size-4 flex-none text-good" />Track creators, generate ideas and analyze videos (analyzing uses 1 credit)</li>
                {details.scope.split(" ").filter((s) => SCOPE_TEXT[s]).map((s) => (
                  <li key={s} className="flex gap-2"><Check className="mt-0.5 size-4 flex-none text-good" />{SCOPE_TEXT[s]}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">It can&apos;t see your password or payment details. Block individual tools any time in Settings → Connectors.</p>
            </div>
            <p className="mt-3 truncate text-xs text-subtle" title={details.redirect_uri}>You&apos;ll return to {details.redirect_uri}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button loading={busy === "deny"} disabled={busy !== null} onClick={() => decide(false)}>Deny</Button>
              <Button variant="primary" loading={busy === "approve"} disabled={busy !== null} onClick={() => decide(true)}>Allow access</Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
