"use client";

import { useMemo, useState } from "react";
import { Link2, Plus, Search, Sparkles, Trash2, Users, Wand2 } from "lucide-react";
import { useAction, useStore } from "@/lib/store";
import { suggestedChannels, channels as seedChannels } from "@/lib/mock/data";
import type { Channel, Platform } from "@/lib/types";
import { compact, uid } from "@/lib/utils";
import { Avatar, Button, Card, EmptyState, Field, Input, Modal, PageHeader, PlatformIcon, Tabs, Textarea } from "@/components/ui";
import { LiveChannels } from "@/components/features/live-channels";

const WAYS = ["Suggested", "Describe your niche", "Search creators", "Add by URL"] as const;
type Way = (typeof WAYS)[number];

function ChannelRow({ c, action }: { c: Channel; action: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <Avatar name={c.name} color={c.color} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{c.name}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted"><PlatformIcon platform={c.platform} /> @{c.handle}</p>
      </div>
      <div className="hidden w-24 text-right text-xs sm:block"><p className="font-semibold tabular">{compact(c.followers)}</p><p className="text-subtle">followers</p></div>
      <div className="hidden w-24 text-right text-xs sm:block"><p className="font-semibold tabular">{compact(c.totalViews)}</p><p className="text-subtle">views</p></div>
      {action}
    </li>
  );
}

function parseUrl(url: string): { platform: Platform; handle: string } | null {
  const m =
    url.match(/tiktok\.com\/@([\w.]+)/i)?.[1] ? { platform: "tiktok" as const, handle: url.match(/tiktok\.com\/@([\w.]+)/i)![1] } :
    url.match(/instagram\.com\/([\w.]+)/i)?.[1] ? { platform: "instagram" as const, handle: url.match(/instagram\.com\/([\w.]+)/i)![1] } :
    url.match(/youtube\.com\/@([\w.-]+)/i)?.[1] ? { platform: "youtube" as const, handle: url.match(/youtube\.com\/@([\w.-]+)/i)![1] } : null;
  return m;
}

export default function ChannelsPage() {
  const { live } = useStore();
  return live ? <LiveChannels /> : <DemoChannels />;
}

function DemoChannels() {
  const { ws, allChannels, addChannel, removeChannel, limits, toast } = useStore();
  const run = useAction();
  const [open, setOpen] = useState(false);
  const [way, setWay] = useState<Way>("Suggested");
  const [desc, setDesc] = useState("");
  const [descResults, setDescResults] = useState<Channel[] | null>(null);
  const [q, setQ] = useState("");
  const [url, setUrl] = useState("");
  const [confirm, setConfirm] = useState<Channel | null>(null);

  const watch = allChannels.filter((c) => ws.channelIds.includes(c.id));
  const pool = useMemo(() => [...seedChannels, ...suggestedChannels], []);
  const searchResults = q.trim() ? pool.filter((c) => `${c.handle} ${c.name}`.toLowerCase().includes(q.toLowerCase())) : [];
  const add = (c: Channel) => run(() => { addChannel(c); toast(`Tracking @${c.handle}`); });
  const tracked = (c: Channel) => ws.channelIds.includes(c.id);
  const addBtn = (c: Channel) => (
    <Button variant={tracked(c) ? "ghost" : "primary"} disabled={tracked(c)} onClick={() => add(c)} aria-label={`Track @${c.handle}`}>
      {tracked(c) ? "Tracking" : <><Plus className="size-4" /> Track</>}
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Channels"
        subtitle={`Your watchlist — ${watch.length} of ${limits.competitors} channels in this workspace`}
        actions={<Button variant="primary" onClick={() => setOpen(true)}><Plus className="size-4" /> Add channels</Button>}
      />

      {watch.length === 0 ? (
        <EmptyState icon={Users} title="No channels yet" body="Track creators in your niche to fill your outlier feed." action={<Button variant="primary" onClick={() => setOpen(true)}>Add your first channel</Button>} />
      ) : (
        <Card className="px-4">
          <div className="hidden items-center gap-3 border-b border-line py-2 text-[11px] font-semibold uppercase tracking-wide text-subtle sm:flex">
            <span className="flex-1 pl-[52px]">Creator</span><span className="w-24 text-right">Followers</span><span className="w-24 text-right">Views</span><span className="w-9" />
          </div>
          <ul className="divide-y divide-line">
            {watch.map((c) => (
              <ChannelRow key={c.id} c={c} action={<Button variant="ghost" aria-label={`Remove @${c.handle}`} title="Remove" onClick={() => setConfirm(c)}><Trash2 className="size-4" /></Button>} />
            ))}
          </ul>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add channels" wide>
        <Tabs value={way} options={WAYS} onChange={setWay} />
        <div className="mt-4">
          {way === "Suggested" && (
            <>
              <p className="flex items-center gap-1.5 text-xs text-muted"><Sparkles className="size-3.5 text-accent" /> Based on the channels you already track</p>
              <ul className="divide-y divide-line">{suggestedChannels.map((c) => <ChannelRow key={c.id} c={c} action={addBtn(c)} />)}</ul>
            </>
          )}
          {way === "Describe your niche" && (
            <form onSubmit={(e) => { e.preventDefault(); setDescResults(pool.slice(0, 6 + (desc.length % 3))); }}>
              <Field label="Describe the content you want to learn from" hint="e.g. “Fitness creators who post quick home workouts for busy parents”">
                <Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
              </Field>
              <Button type="submit" variant="accent" className="mt-3" disabled={desc.trim().length < 8}><Wand2 className="size-4" /> Find channels</Button>
              {descResults && <ul className="mt-3 divide-y divide-line">{descResults.map((c) => <ChannelRow key={c.id} c={c} action={addBtn(c)} />)}</ul>}
            </form>
          )}
          {way === "Search creators" && (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                <Input aria-label="Search creators" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or @handle" />
              </div>
              <ul className="mt-2 divide-y divide-line">{searchResults.map((c) => <ChannelRow key={c.id} c={c} action={addBtn(c)} />)}</ul>
              {q && searchResults.length === 0 && <p className="py-6 text-center text-sm text-muted">No creators found. Try adding them by URL.</p>}
            </>
          )}
          {way === "Add by URL" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const p = parseUrl(url);
                if (!p) return;
                add({ id: uid("ch"), handle: p.handle, name: p.handle, platform: p.platform, followers: 0, totalViews: 0, color: "#64748b" });
                setUrl("");
              }}
            >
              <Field label="Profile URL" hint="Supported: tiktok.com/@handle, instagram.com/handle, youtube.com/@handle. Stats fill in after the first sync.">
                <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.tiktok.com/@creator" />
              </Field>
              {url && !parseUrl(url) && <p role="alert" className="mt-2 text-xs text-danger">That doesn&apos;t look like a supported TikTok, Instagram or YouTube profile URL.</p>}
              <Button type="submit" variant="primary" className="mt-3" disabled={!parseUrl(url)}><Link2 className="size-4" /> Add channel</Button>
            </form>
          )}
        </div>
      </Modal>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Remove channel?"
        footer={<><Button onClick={() => setConfirm(null)}>Cancel</Button><Button variant="danger" onClick={() => { if (confirm) { removeChannel(confirm.id); toast(`Removed @${confirm.handle}`); } setConfirm(null); }}>Remove</Button></>}
      >
        <p className="text-sm text-muted">@{confirm?.handle} will stop appearing in your feed. Saved and analyzed videos stay in your library.</p>
      </Modal>
    </>
  );
}
