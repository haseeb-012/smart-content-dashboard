"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Link2, Loader2, Plus, RefreshCw, Search, Sparkles, Trash2, Users, Wand2 } from "lucide-react";
import { api, ApiError, type ApiChannel, type ApiChannelSearchResult, type ApiPlatform, type ApiWatchlistItem } from "@/lib/api/client";
import { useAsyncAction, useStore } from "@/lib/store";
import { ago, compact } from "@/lib/utils";
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, PlatformIcon, Select, Skeleton, Tabs } from "@/components/ui";

const WAYS = ["Suggested", "Search creators", "Add by URL", "Describe your niche"] as const;
type Way = (typeof WAYS)[number];
const PLATFORM_LABEL: Record<ApiPlatform, string> = { tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube" };
const color = (s: string) => `hsl(${[...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7)} 65% 52%)`;

function StatusBadge({ c }: { c: ApiChannel }) {
  if (c.sync_status === "pending") return <Badge tone="accent"><Loader2 className="size-3 animate-spin" /> Fetching videos…</Badge>;
  if (c.sync_status === "error") return <Badge tone="danger" className="max-w-56 truncate" >{c.sync_error ?? "Sync failed"}</Badge>;
  return <span className="text-xs text-subtle">Updated {c.last_synced_at ? ago(c.last_synced_at) : "—"}</span>;
}

function Row({ name, handle, platform, followers, extra, action }: {
  name: string; handle: string; platform: ApiPlatform; followers: number | null; extra?: React.ReactNode; action: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      <Avatar name={name || handle} color={color(handle)} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{name || handle}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted"><PlatformIcon platform={platform} /> @{handle}</p>
      </div>
      <div className="hidden w-24 text-right text-xs sm:block"><p className="font-semibold tabular">{followers != null ? compact(followers) : "—"}</p><p className="text-subtle">followers</p></div>
      {extra}
      {action}
    </li>
  );
}

export function LiveChannels() {
  const { state, limits, toast } = useStore();
  const run = useAsyncAction();
  const ws = state.activeId;
  const [rows, setRows] = useState<ApiWatchlistItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [way, setWay] = useState<Way>("Suggested");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ApiWatchlistItem | null>(null);
  const [suggested, setSuggested] = useState<ApiChannel[] | null>(null);
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState<ApiPlatform | "">("");
  const [results, setResults] = useState<ApiChannelSearchResult[] | null>(null);
  const [url, setUrl] = useState("");
  const [niche, setNiche] = useState("");
  const [nicheBusy, setNicheBusy] = useState(false);
  const [nicheResults, setNicheResults] = useState<ApiChannelSearchResult[] | null>(null);
  const poll = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!ws) return;
    try {
      setRows(await api.watchlist(ws));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load your channels.");
    }
  }, [ws]);

  // Initial load (later refreshes call `load()` from event handlers / the poller).
  useEffect(() => {
    if (!ws) return;
    let cancelled = false;
    api.watchlist(ws)
      .then((r) => { if (!cancelled) { setRows(r); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e instanceof ApiError ? e.message : "Couldn't load your channels."); });
    return () => { cancelled = true; };
  }, [ws]);

  // While any channel is still fetching its videos, refresh the list every few seconds.
  useEffect(() => {
    const pending = rows?.some((r) => r.sync_status === "pending");
    if (pending && poll.current === null) poll.current = window.setInterval(() => void load(), 3000);
    if (!pending && poll.current !== null) { window.clearInterval(poll.current); poll.current = null; }
    return () => { if (poll.current !== null) { window.clearInterval(poll.current); poll.current = null; } };
  }, [rows, load]);

  useEffect(() => {
    if (open && way === "Suggested" && suggested === null && ws) api.suggestedChannels(ws).then(setSuggested).catch(() => setSuggested([]));
  }, [open, way, suggested, ws]);

  const tracked = new Set(rows?.map((r) => `${r.platform}:${r.handle}`));
  const add = async (key: string, body: { url: string } | { platform: ApiPlatform; handle: string }) => {
    setBusy(key);
    const res = await run(() => api.addChannel(ws, body));
    setBusy(null);
    if (res) {
      toast(res.added ? `Tracking @${res.channel.handle} — fetching their videos` : `@${res.channel.handle} is already on your watchlist`);
      await load();
    }
    return res;
  };
  const trackBtn = (key: string, p: ApiPlatform, h: string) =>
    tracked.has(`${p}:${h}`) ? (
      <Button variant="ghost" disabled>Tracking</Button>
    ) : (
      <Button variant="primary" loading={busy === key} onClick={() => add(key, { platform: p, handle: h })} aria-label={`Track @${h}`}>
        <Plus className="size-4" /> Track
      </Button>
    );

  const doSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setResults(null);
    const r = await run(() => api.searchChannels(ws, q.trim(), platform || undefined));
    setResults(r ?? []);
  };

  return (
    <>
      <PageHeader
        title="Channels"
        subtitle={`Your watchlist — ${rows?.length ?? 0} of ${limits.competitors} channels in this workspace`}
        actions={<Button variant="primary" onClick={() => setOpen(true)}><Plus className="size-4" /> Add channels</Button>}
      />

      {error ? (
        <div role="alert" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-danger">
          <AlertCircle className="size-4" /><span className="flex-1">{error}</span><Button onClick={() => void load()}>Retry</Button>
        </div>
      ) : rows === null ? (
        <Card className="space-y-3 p-4" aria-busy="true">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</Card>
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title="No channels yet" body="Track creators in your niche — we fetch their recent videos and find the outliers." action={<Button variant="primary" onClick={() => setOpen(true)}>Add your first channel</Button>} />
      ) : (
        <Card className="px-4">
          <div className="hidden items-center gap-3 border-b border-line py-2 text-[11px] font-semibold uppercase tracking-wide text-subtle sm:flex">
            <span className="flex-1 pl-[52px]">Creator</span><span className="w-24 text-right">Followers</span><span className="w-28 text-right">Videos · outliers</span><span className="w-44" /><span className="w-20" />
          </div>
          <ul className="divide-y divide-line">
            {rows.map((c) => (
              <Row
                key={c.id}
                name={c.display_name}
                handle={c.handle}
                platform={c.platform}
                followers={c.followers}
                extra={
                  <>
                    <div className="hidden w-28 text-right text-xs sm:block"><p className="font-semibold tabular">{c.video_count} · {c.outlier_videos}</p><p className="text-subtle">≥5x outliers</p></div>
                    <div className="hidden w-44 text-right md:block"><StatusBadge c={c} /></div>
                  </>
                }
                action={
                  <div className="flex w-20 justify-end">
                    <Button
                      variant="ghost"
                      aria-label={`Refresh @${c.handle}`}
                      title="Refresh now"
                      disabled={c.sync_status === "pending"}
                      onClick={async () => { if (await run(() => api.refreshChannel(ws, c.id))) { toast(`Refreshing @${c.handle}`); await load(); } }}
                    >
                      <RefreshCw className="size-4" />
                    </Button>
                    <Button variant="ghost" aria-label={`Remove @${c.handle}`} title="Remove" onClick={() => setConfirm(c)}><Trash2 className="size-4" /></Button>
                  </div>
                }
              />
            ))}
          </ul>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add channels" wide>
        <Tabs value={way} options={WAYS} onChange={setWay} />
        <div className="mt-4">
          {way === "Suggested" && (
            suggested === null ? <Skeleton className="h-32" /> : suggested.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No suggestions yet — search for a creator or paste their profile link.</p>
            ) : (
              <>
                <p className="flex items-center gap-1.5 text-xs text-muted"><Sparkles className="size-3.5 text-accent" /> Popular with other creators</p>
                <ul className="divide-y divide-line">{suggested.map((c) => <Row key={c.id} name={c.display_name} handle={c.handle} platform={c.platform} followers={c.followers} action={trackBtn(`s:${c.id}`, c.platform, c.handle)} />)}</ul>
              </>
            )
          )}
          {way === "Search creators" && (
            <form onSubmit={doSearch}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                  <Input aria-label="Search creators" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or exact @handle" />
                </div>
                <Select aria-label="Platform" className="w-36" value={platform} onChange={(e) => setPlatform(e.target.value as ApiPlatform | "")}>
                  <option value="">All platforms</option><option value="tiktok">TikTok</option><option value="instagram">Instagram</option><option value="youtube">YouTube</option>
                </Select>
                <Button type="submit" variant="primary" disabled={q.trim().length < 2}>Search</Button>
              </div>
              {results && (
                results.length === 0 ? <p className="py-6 text-center text-sm text-muted">No creators found. Try their exact handle, or add them by URL.</p> : (
                  <ul className="mt-2 divide-y divide-line">
                    {results.map((r) => (
                      <Row key={`${r.platform}:${r.handle}`} name={r.display_name} handle={r.handle} platform={r.platform} followers={r.followers}
                        extra={<span className="hidden text-xs text-subtle sm:inline">{PLATFORM_LABEL[r.platform]}</span>}
                        action={trackBtn(`r:${r.platform}:${r.handle}`, r.platform, r.handle)} />
                    ))}
                  </ul>
                )
              )}
            </form>
          )}
          {way === "Add by URL" && (
            <form onSubmit={async (e) => { e.preventDefault(); if (await add("url", { url: url.trim() })) setUrl(""); }}>
              <Field label="Profile URL" hint="tiktok.com/@handle, instagram.com/handle or youtube.com/@handle. We check the account exists before adding it.">
                <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.tiktok.com/@creator" />
              </Field>
              <Button type="submit" variant="primary" className="mt-3" loading={busy === "url"} disabled={!url.trim()}><Link2 className="size-4" /> Add channel</Button>
            </form>
          )}
          {way === "Describe your niche" && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              setNicheBusy(true); setNicheResults(null);
              const r = await run(() => api.nicheSearch(ws, niche.trim(), platform || undefined));
              setNicheResults(r ?? []); setNicheBusy(false);
            }}>
              <Field label="Describe your niche" hint="The AI suggests creators, then we check each account exists before showing it. Free.">
                <Input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="e.g. budget travel tips for students" />
              </Field>
              <div className="mt-3 flex gap-2">
                <Select aria-label="Platform" className="w-40" value={platform} onChange={(e) => setPlatform(e.target.value as ApiPlatform | "")}>
                  <option value="">All platforms</option><option value="tiktok">TikTok</option><option value="instagram">Instagram</option><option value="youtube">YouTube</option>
                </Select>
                <Button type="submit" variant="primary" loading={nicheBusy} disabled={niche.trim().length < 5}><Wand2 className="size-4" /> Find creators</Button>
              </div>
              {nicheBusy && <p className="mt-3 text-sm text-muted" role="status">Finding and checking creators — this can take a few seconds…</p>}
              {nicheResults && (
                nicheResults.length === 0 ? <p className="py-6 text-center text-sm text-muted">No matching creators found. Try a more specific description.</p> : (
                  <ul className="mt-2 divide-y divide-line">
                    {nicheResults.map((r) => (
                      <Row key={`${r.platform}:${r.handle}`} name={r.display_name} handle={r.handle} platform={r.platform} followers={r.followers}
                        extra={<span className="hidden text-xs text-subtle sm:inline">{PLATFORM_LABEL[r.platform]}</span>}
                        action={trackBtn(`n:${r.platform}:${r.handle}`, r.platform, r.handle)} />
                    ))}
                  </ul>
                )
              )}
            </form>
          )}
        </div>
      </Modal>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Remove channel?"
        footer={
          <>
            <Button onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={async () => {
              const c = confirm; setConfirm(null);
              if (c && (await run(async () => { await api.removeChannel(ws, c.id); return true; }))) { toast(`Removed @${c.handle}`); await load(); }
            }}>Remove</Button>
          </>
        }
      >
        <p className="text-sm text-muted">@{confirm?.handle} will stop appearing in your feed.</p>
      </Modal>
    </>
  );
}
