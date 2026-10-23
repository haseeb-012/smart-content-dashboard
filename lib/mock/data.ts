// Deterministic demo data used until the backend (/api/v1) is live. Not real creators.
import type { Channel, Collection, Hook, HookCategory, Platform, Video } from "@/lib/types";

const NOW = Date.parse("2026-10-23T09:00:00Z");
export const DEMO_NOW = NOW;

let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];

const colors = ["#6d4dff", "#14b8a6", "#f97316", "#3b82f6", "#ec4899", "#22c55e", "#eab308", "#a855f7", "#06b6d4", "#ef4444"];
const hues = [
  "from-[#3b2a8c] via-[#6d4dff] to-[#f5a3c7]", "from-[#0f766e] via-[#14b8a6] to-[#a7f3d0]", "from-[#7c2d12] via-[#f97316] to-[#fde68a]",
  "from-[#1e3a8a] via-[#3b82f6] to-[#bfdbfe]", "from-[#831843] via-[#ec4899] to-[#fbcfe8]", "from-[#14532d] via-[#22c55e] to-[#bbf7d0]",
  "from-[#713f12] via-[#eab308] to-[#fef08a]", "from-[#4c1d95] via-[#a855f7] to-[#e9d5ff]",
];

const channelSeeds: Array<[string, string, Platform]> = [
  ["studio.ana", "Ana Studio", "instagram"], ["buildwithleo", "Leo Builds", "tiktok"], ["factlab", "Fact Lab", "youtube"],
  ["nora.codes", "Nora Codes", "tiktok"], ["fitwithkai", "Kai Fitness", "instagram"], ["moneymarta", "Marta Money", "youtube"],
  ["cheftomas", "Chef Tomas", "tiktok"], ["dailydev", "Daily Dev", "youtube"], ["travelrui", "Rui Travels", "instagram"],
  ["mindfulmo", "Mo Mindful", "tiktok"], ["gadgetgail", "Gail Gadgets", "youtube"], ["startupsam", "Sam Startups", "instagram"],
];

export const channels: Channel[] = channelSeeds.map(([handle, name, platform], i) => ({
  id: `ch_${i + 1}`,
  handle,
  name,
  platform,
  followers: Math.round(40_000 + rnd() * 4_000_000),
  totalViews: Math.round(2_000_000 + rnd() * 400_000_000),
  color: colors[i % colors.length],
}));

const titles = [
  "Nobody talks about this part of growing online", "I tested 5 AI tools for a week", "The $400M machine explained in 60 seconds",
  "Stop doing this if you want more views", "This changed how I write every hook", "What 30 days of posting daily taught me",
  "The one habit that doubled my output", "Why most creators quit at 1,000 followers", "I copied a viral format — here's what happened",
  "Three mistakes I made on my first 100 videos", "This tiny edit keeps people watching", "The real reason your videos flop",
  "How I plan a month of content in an hour", "You're using this feature wrong", "Before vs after: same script, new hook",
  "The secret behind every 10M-view video", "I asked 100 creators the same question", "Here's what nobody tells you about Shorts",
];

export const videos: Video[] = Array.from({ length: 64 }, (_, i) => {
  const ch = channels[i % channels.length];
  const out = Math.round((rnd() ** 3 * 110 + 0.6) * 10) / 10;
  const base = ch.followers * (0.05 + rnd() * 0.2);
  const views = Math.round(base * out);
  const likes = Math.round(views * (0.02 + rnd() * 0.08));
  const comments = Math.round(likes * (0.01 + rnd() * 0.05));
  return {
    id: `v_${i + 1}`,
    channelId: ch.id,
    platform: ch.platform,
    title: titles[i % titles.length],
    caption: `${titles[i % titles.length]}. Save this for later and follow for part two. #creator #shortform`,
    postedAt: new Date(NOW - Math.round(rnd() * 300) * 86_400_000).toISOString(),
    views,
    likes,
    comments,
    engagement: Math.round(((likes + comments) / views) * 1000) / 10,
    outlier: out,
    durationSec: Math.round(15 + rnd() * 75),
    hue: hues[i % hues.length],
  };
});

const hookTemplates: Array<[HookCategory, string]> = [
  ["Contrarian", "Everyone says {x}. They're wrong."],
  ["Contrarian", "Stop {doing x} if you want {result}."],
  ["Contrarian", "Unpopular opinion: {x} is overrated."],
  ["Curiosity gap", "Nobody tells you this about {x}…"],
  ["Curiosity gap", "I tried {x} for 30 days. Here's what happened."],
  ["Curiosity gap", "The real reason {x} works (it's not what you think)."],
  ["Question", "Why does nobody talk about {x}?"],
  ["Question", "What would you do if {x}?"],
  ["Question", "Is {x} actually worth it?"],
  ["Unexpected claim", "{x} made me more money than my job."],
  ["Unexpected claim", "This 10-second trick beats {x}."],
  ["Unexpected claim", "I spent $0 on {x} and still won."],
  ["Problem", "If {x} keeps happening to you, watch this."],
  ["Problem", "You're losing {result} because of {x}."],
  ["Problem", "The biggest mistake people make with {x}."],
];
export const HOOK_TEMPLATES = hookTemplates;

const niches = ["Fitness", "Finance", "Tech", "Food", "Travel", "Productivity", "Business"];
const fills: Record<string, string[]> = {
  Fitness: ["cardio", "meal prep", "home workouts"], Finance: ["budgeting", "index funds", "side hustles"],
  Tech: ["AI tools", "new phones", "coding"], Food: ["air fryers", "meal prep", "street food"],
  Travel: ["budget travel", "packing", "travel hacks"], Productivity: ["to-do lists", "deep work", "mornings"],
  Business: ["cold email", "pricing", "first hires"],
};

export const hooks: Hook[] = Array.from({ length: 56 }, (_, i) => {
  const [category, tpl] = hookTemplates[i % hookTemplates.length];
  const niche = niches[i % niches.length];
  const x = pick(fills[niche]);
  return {
    id: `h_${i + 1}`,
    category,
    niche,
    text: tpl.replace("{x}", x).replace("{doing x}", `obsessing over ${x}`).replace("{result}", "growth"),
    views: Math.round(200_000 + rnd() * 25_000_000),
  };
});

export const collections: Collection[] = [
  ["breakdown-explainer", "Breakdown / Explainer", "Formats", "Explainers", "Takes one complex topic and explains it in three quick beats."],
  ["top-3-countdown", "Top 3 Countdown", "Formats", "Listicle", "Counts down to the best item to hold attention to the end."],
  ["before-after", "Before / After", "Formats", "Story", "Shows a transformation, then explains how it happened."],
  ["case-study", "Case Study", "Signature Series", "Case study", "A recurring series breaking down one company or creator."],
  ["myth-vs-fact", "Myth vs Fact", "Signature Series", "Education", "Debunks a common belief in a repeatable branded format."],
  ["fast-push-in", "Fast Push-In", "Visual Hooks", "Camera", "A sudden zoom on the subject in the first frame."],
  ["unexpected-first-frame", "Unexpected First Frame", "Visual Hooks", "Opening scene", "Opens on an image that doesn't seem to belong."],
  ["whip-pan", "Whip Pan Reveal", "Visual Hooks", "Camera", "A fast pan that reveals the subject or result."],
  ["side-by-side", "Side-by-Side Compare", "Editing Styles", "Studio", "Split screen comparing two options in real time."],
  ["kinetic-captions", "Kinetic Captions", "Editing Styles", "Text", "Animated, word-by-word captions that pace the story."],
  ["jump-cut-pacing", "Jump-Cut Pacing", "Editing Styles", "Pacing", "Removes every pause to keep momentum high."],
  ["green-screen", "Green Screen Explainer", "Editing Styles", "Studio", "Creator in front of a screenshot or article they react to."],
].map(([slug, name, category, sub, description], i) => ({
  slug, name, category: category as Collection["category"], sub, description,
  breakdown: [
    "Hook lands in the first 2 seconds with a clear promise.",
    "The pattern repeats every 3–5 seconds to reset attention.",
    "Payoff arrives before the 70% mark; CTA is one short line.",
  ],
  videoIds: videos.slice((i * 5) % 50, ((i * 5) % 50) + 5 + (i % 4)).map((v) => v.id),
  hue: hues[i % hues.length],
}));

export const suggestedChannels: Channel[] = [
  ["growthgrace", "Grace Grows", "tiktok"], ["editwitheli", "Eli Edits", "instagram"], ["thehookguy", "The Hook Guy", "youtube"],
  ["scriptsbysara", "Sara Scripts", "tiktok"], ["nichenate", "Nate's Niche", "instagram"], ["viralvic", "Vic Viral", "youtube"],
].map(([handle, name, platform], i) => ({
  id: `sug_${i + 1}`, handle, name, platform: platform as Platform,
  followers: Math.round(80_000 + rnd() * 2_000_000), totalViews: Math.round(5_000_000 + rnd() * 90_000_000),
  color: colors[(i + 3) % colors.length],
}));

export const PLAN_LIMITS = {
  pro: { name: "Pro", credits: 100, workspaces: 3, competitors: 150, verified: 3, refresh: "12 hours", monthly: 49, yearly: 39, mcp: true, api: false, guests: false },
  visionary: { name: "Visionary", credits: 250, workspaces: 5, competitors: 250, verified: 5, refresh: "6 hours", monthly: 99, yearly: 79, mcp: true, api: false, guests: false },
  titan: { name: "Titan", credits: 1500, workspaces: 20, competitors: 1000, verified: 20, refresh: "1 hour", monthly: 499, yearly: 399, mcp: true, api: true, guests: true },
} as const;
