"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BadgeCheck, Eye, FileVideo, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { videos, DEMO_NOW } from "@/lib/mock/data";
import { ago, compact } from "@/lib/utils";
import { ButtonLink, Card, EmptyState, MetricChips, PageHeader, PlatformIcon, Segmented } from "@/components/ui";
import { LineChart } from "@/components/features/charts";
import { VideoThumb } from "@/components/features/video-card";

const RANGES = ["7d", "30d", "90d"] as const;
type Range = (typeof RANGES)[number];

// Demo series for verified accounts — replaced by the analytics API in Phase 5.
function series(days: number, base: number, seed: number) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(DEMO_NOW - (days - 1 - i) * 86_400_000);
    const wave = Math.sin((i + seed) / 3) * 0.35 + Math.sin((i * seed) / 7) * 0.2 + 1;
    return { x: d.toLocaleDateString("en", { month: "short", day: "numeric" }), y: Math.max(0, Math.round(base * wave)) };
  });
}
const cumulative = (s: Array<{ x: string; y: number }>) => s.reduce<Array<{ x: string; y: number }>>((a, d) => [...a, { x: d.x, y: (a.at(-1)?.y ?? 0) + d.y }], []);

function Metric({ icon: Icon, label, value, delta }: { icon: typeof Eye; label: string; value: string; delta?: string }) {
  return (
    <Card className="p-4">
      <p className="flex items-center gap-2 text-xs font-medium text-muted"><Icon className="size-4" />{label}</p>
      <p className="mt-2 font-display text-[28px] font-medium leading-none tabular">{value}</p>
      {delta && <p className="mt-2 text-xs font-semibold text-good">{delta}</p>}
    </Card>
  );
}

export default function DashboardPage() {
  const { state } = useStore();
  const [range, setRange] = useState<Range>("30d");
  const verified = state.social.filter((s) => s.status === "verified");
  const days = { "7d": 7, "30d": 30, "90d": 90 }[range];

  const data = useMemo(() => {
    const views = series(days, 42_000 * Math.max(1, verified.length), 3);
    const followers = series(days, 380 * Math.max(1, verified.length), 5);
    return { views, followers, cumViews: cumulative(views), cumFollowers: cumulative(followers) };
  }, [days, verified.length]);

  if (verified.length === 0)
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

  const totalViews = data.views.reduce((s, d) => s + d.y, 0);
  const gained = data.followers.reduce((s, d) => s + d.y, 0);
  const recent = videos.slice(0, 6);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`${verified.length} verified account${verified.length > 1 ? "s" : ""}: ${verified.map((v) => `@${v.handle}`).join(", ")}`}
        actions={<Segmented label="Time period" value={range} options={RANGES} onChange={setRange} />}
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric icon={Users} label="Total followers" value={compact(1_240_000 * verified.length)} />
        <Metric icon={UserPlus} label={`Followers gained (${range})`} value={compact(gained)} delta="▲ vs previous period" />
        <Metric icon={Eye} label={`Views (${range})`} value={compact(totalViews)} />
        <Metric icon={FileVideo} label="Posts" value={String(42 * verified.length)} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4"><h2 className="mb-2 text-sm font-semibold">Views by day</h2><LineChart label="Views by day" kind="bar" data={data.views} /></Card>
        <Card className="p-4"><h2 className="mb-2 text-sm font-semibold">Cumulative views</h2><LineChart label="Cumulative views" data={data.cumViews} /></Card>
        <Card className="p-4"><h2 className="mb-2 text-sm font-semibold">Followers gained by day</h2><LineChart label="Followers gained by day" kind="bar" data={data.followers} /></Card>
        <Card className="p-4"><h2 className="mb-2 text-sm font-semibold">Cumulative followers</h2><LineChart label="Cumulative followers" data={data.cumFollowers} /></Card>
      </div>
      <Card className="mt-4 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent videos</h2>
          <span className="flex items-center gap-1 text-xs text-muted"><BadgeCheck className="size-3.5 text-accent" /> Verified accounts only</span>
        </div>
        <ul className="divide-y divide-line">
          {recent.map((v) => (
            <li key={v.id}>
              <Link href={`/videos/${v.id}`} className="flex items-center gap-3 py-3 hover:bg-surface-2">
                <VideoThumb video={v} className="w-12 flex-none rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{v.title}</p>
                  <p className="flex items-center gap-1.5 text-xs text-muted"><PlatformIcon platform={v.platform} /> {ago(v.postedAt, DEMO_NOW)}</p>
                </div>
                <MetricChips score={v.outlier} views={v.views} engagement={v.engagement} />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
