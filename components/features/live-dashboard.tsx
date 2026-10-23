"use client";

// Live Dashboard (own verified accounts) + Social verification, backed by /me/analytics and /me/social.
import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, BadgeCheck, Copy, Eye, FileVideo, ShieldCheck, Trash2, TrendingUp, UserPlus, Users } from "lucide-react";
import { api, ApiError, type ApiAnalytics, type ApiPlatform, type ApiSocialAccount } from "@/lib/api/client";
import { useStore } from "@/lib/store";
import { ago, compact } from "@/lib/utils";
import { Badge, Button, ButtonLink, Card, EmptyState, Field, Input, PageHeader, PlatformIcon, Segmented, Select, Skeleton } from "@/components/ui";
import { LineChart } from "@/components/features/charts";

const RANGES = ["7d", "30d", "90d"] as const;
type Range = (typeof RANGES)[number];
const DAYS: Record<Range, 7 | 30 | 90> = { "7d": 7, "30d": 30, "90d": 90 };
const fmtDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en", { month: "short", day: "numeric" });
const cumulative = (s: Array<{ x: string; y: number }>) => s.reduce<Array<{ x: string; y: number }>>((a, d) => [...a, { x: d.x, y: (a.at(-1)?.y ?? 0) + d.y }], []);

function Metric({ icon: Icon, label, value, note }: { icon: typeof Eye; label: string; value: string; note?: string }) {
  return (
    <Card className="p-4">
      <p className="flex items-center gap-2 text-xs font-medium text-muted"><Icon className="size-4" />{label}</p>
      <p className="mt-2 font-display text-[28px] font-medium leading-none tabular">{value}</p>
      {note && <p className="mt-2 text-xs text-muted">{note}</p>}
    </Card>
  );
}

export function LiveDashboard() {
  const [range, setRange] = useState<Range>("30d");
  const [data, setData] = useState<ApiAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    api.analytics(DAYS[range])
      .then((d) => { if (alive) { setData(d); setError(null); } })
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : "Couldn't load your analytics."));
    return () => { alive = false; };
  }, [range, tick]);

  // While a freshly verified account is still importing, refresh every few seconds.
  const importing = data?.accounts.some((a) => a.channel && a.channel.sync_status === "pending");
  useEffect(() => {
    if (!importing) return;
    const t = setInterval(() => setTick((x) => x + 1), 4000);
    return () => clearInterval(t);
  }, [importing]);

  if (error) return <EmptyState icon={AlertCircle} title="Couldn't load your analytics" body={error} action={<Button onClick={() => setTick((x) => x + 1)}>Try again</Button>} />;
  if (!data) return <div className="space-y-3" aria-busy="true"><Skeleton className="h-8 w-48" /><Skeleton className="h-28 w-full" /><Skeleton className="h-64 w-full" /></div>;

  if (data.accounts.length === 0)
    return (
      <>
        <PageHeader title="Dashboard" subtitle="Performance analytics for your own verified accounts" />
        <EmptyState
          icon={ShieldCheck}
          title="Connect an account to see your analytics"
          body="Verify a TikTok, Instagram or YouTube account with a bio code — no password needed. Everything else in Smart Content works without it."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <ButtonLink href="/settings?tab=Social%20verification" variant="primary"><UserPlus className="size-4" /> Verify an account</ButtonLink>
              <ButtonLink href="/videos">Browse outliers</ButtonLink>
            </div>
          }
        />
      </>
    );

  const views = data.views_by_day.map((p) => ({ x: fmtDay(p.date), y: p.value }));
  const followers = data.followers_by_day.map((p) => ({ x: fmtDay(p.date), y: p.value }));
  const hasFollowerHistory = data.followers_gained !== null;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`${data.accounts.length} verified account${data.accounts.length > 1 ? "s" : ""}: ${data.accounts.map((a) => `@${a.handle}`).join(", ")}`}
        actions={<Segmented label="Time period" value={range} options={RANGES} onChange={setRange} />}
      />
      {importing && <p className="mb-3 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent" role="status">Importing your videos — numbers fill in within a minute.</p>}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric icon={Users} label="Total followers" value={data.total_followers != null ? compact(data.total_followers) : "—"} />
        <Metric icon={UserPlus} label={`Followers gained (${range})`} value={hasFollowerHistory ? compact(data.followers_gained ?? 0) : "—"} note={hasFollowerHistory ? undefined : "Tracking started — growth shows from tomorrow"} />
        <Metric icon={Eye} label={`Views on posts (${range})`} value={compact(data.views)} />
        <Metric icon={FileVideo} label={`Posts (${range})`} value={String(data.posts)} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4"><h2 className="mb-2 text-sm font-semibold">Views by posting day</h2><LineChart label="Views by posting day" kind="bar" data={views} /></Card>
        <Card className="p-4"><h2 className="mb-2 text-sm font-semibold">Cumulative views</h2><LineChart label="Cumulative views" data={cumulative(views)} /></Card>
        <Card className="p-4"><h2 className="mb-2 text-sm font-semibold">Followers gained by day</h2><LineChart label="Followers gained by day" kind="bar" data={followers} /></Card>
        <Card className="p-4"><h2 className="mb-2 text-sm font-semibold">Cumulative followers gained</h2><LineChart label="Cumulative followers gained" data={cumulative(followers)} /></Card>
      </div>
      <Card className="mt-4 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent videos</h2>
          <span className="flex items-center gap-1 text-xs text-muted"><BadgeCheck className="size-3.5 text-accent" /> Verified accounts only</span>
        </div>
        {data.recent_videos.length === 0 ? <p className="py-6 text-center text-sm text-muted">No videos yet.</p> : (
          <ul className="divide-y divide-line">
            {data.recent_videos.map((v) => (
              <li key={v.id}>
                <Link href={`/videos/${v.id}`} className="flex items-center gap-3 py-3 hover:bg-surface-2">
                  <span className="size-12 flex-none rounded-lg bg-surface-2 bg-cover bg-center" style={v.thumbnail_url ? { backgroundImage: `url("${v.thumbnail_url}")` } : undefined} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{v.caption.split("\n")[0] || "Untitled video"}</p>
                    <p className="flex items-center gap-1.5 text-xs text-muted"><PlatformIcon platform={v.platform} /> {v.posted_at ? ago(v.posted_at) : ""}</p>
                  </div>
                  <span className="flex gap-1 text-[11px] font-semibold tabular">
                    {v.outlier_score != null && <span className="inline-flex items-center gap-1 rounded-md bg-good-bg px-1.5 py-0.5 text-good"><TrendingUp className="size-3" />{v.outlier_score >= 10 ? Math.round(v.outlier_score) : v.outlier_score.toFixed(1)}x</span>}
                    <span className="inline-flex items-center gap-1 rounded-md bg-views-bg px-1.5 py-0.5 text-views"><Eye className="size-3" />{compact(v.views)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

export function LiveSocialVerification() {
  const { limits, toast } = useStore();
  const [accounts, setAccounts] = useState<ApiSocialAccount[] | null>(null);
  const [platform, setPlatform] = useState<ApiPlatform>("tiktok");
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [hint, setHint] = useState<Record<string, string>>({});
  useEffect(() => { let alive = true; api.social().then((a) => alive && setAccounts(a)).catch(() => alive && setAccounts([])); return () => { alive = false; }; }, []);

  const list = accounts ?? [];
  const verified = list.filter((a) => a.status === "verified").length;
  const clean = handle.replace(/^@/, "").trim();
  const upsert = (a: ApiSocialAccount) => setAccounts((cur) => [...(cur ?? []).filter((x) => x.id !== a.id), a]);

  const start = async () => {
    setBusy("start");
    try { upsert(await api.startSocial(platform, clean)); setHandle(""); } catch (e) { toast(e instanceof ApiError ? e.message : "Couldn't start verification.", "error"); } finally { setBusy(null); }
  };
  const verify = async (a: ApiSocialAccount) => {
    setBusy(a.id);
    setHint((h) => ({ ...h, [a.id]: "" }));
    try {
      upsert(await api.verifySocial(a.id));
      toast(`@${a.handle} verified — your dashboard is ready`);
    } catch (e) {
      const m = e instanceof ApiError ? e.message : "Verification failed.";
      setHint((h) => ({ ...h, [a.id]: m }));
    } finally { setBusy(null); }
  };
  const remove = async (a: ApiSocialAccount) => {
    try { await api.removeSocial(a.id); setAccounts((cur) => (cur ?? []).filter((x) => x.id !== a.id)); } catch (e) { toast(e instanceof ApiError ? e.message : "Couldn't remove it.", "error"); }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <Card className="h-fit space-y-4 p-5">
        <ol className="space-y-1 text-sm text-muted">
          <li>1. Pick a platform and enter your handle</li><li>2. Copy the code and paste it anywhere in your public bio</li><li>3. Click verify — then you can remove the code again</li>
        </ol>
        <Field label="Platform">
          <Select value={platform} onChange={(e) => setPlatform(e.target.value as ApiPlatform)}><option value="tiktok">TikTok</option><option value="instagram">Instagram</option><option value="youtube">YouTube</option></Select>
        </Field>
        <Field label="Handle"><Input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@yourhandle" /></Field>
        <Button variant="primary" loading={busy === "start"} disabled={!clean || verified >= limits.verified} onClick={start}>Generate code</Button>
        <p className="text-xs text-muted">{verified} of {limits.verified} verified accounts on your plan. We never ask for your password.</p>
      </Card>
      <div className="space-y-3">
        {accounts === null && <Skeleton className="h-24 w-full" />}
        {accounts !== null && list.length === 0 && <Card className="p-5 text-sm text-muted">No accounts yet.</Card>}
        {list.map((a) => (
          <Card key={a.id} className="p-4">
            <div className="flex items-center gap-2">
              <PlatformIcon platform={a.platform} className="size-4" />
              <span className="flex-1 font-semibold">@{a.handle}</span>
              {a.status === "verified" ? <Badge tone="good"><BadgeCheck className="size-3" /> Verified</Badge> : <Badge tone="warn">Pending</Badge>}
              <button aria-label={`Remove @${a.handle}`} className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted hover:bg-black/5" onClick={() => remove(a)}><Trash2 className="size-4" /></button>
            </div>
            {a.status === "verified" && a.channel && (
              <p className="mt-2 text-xs text-muted">{a.channel.followers != null ? `${compact(a.channel.followers)} followers · ` : ""}{a.channel.sync_status === "pending" ? "Importing videos…" : `${a.channel.video_count} videos tracked`}</p>
            )}
            {a.status === "pending" && (
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-2 rounded-lg bg-surface-2 p-3">
                  <code className="flex-1 font-mono text-base font-semibold tracking-wider">{a.code}</code>
                  <Button onClick={() => { void navigator.clipboard.writeText(a.code); toast("Code copied"); }}><Copy className="size-4" /> Copy</Button>
                </div>
                <Button variant="primary" loading={busy === a.id} onClick={() => verify(a)}>{busy === a.id ? "Checking bio…" : "I've added it — verify"}</Button>
                {hint[a.id] && <p role="alert" className="text-xs text-danger">{hint[a.id]}</p>}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
