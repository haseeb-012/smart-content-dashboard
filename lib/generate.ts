// Local stand-ins for the backend AI pipelines (Groq transcript + LLM analysis/script).
// They produce deterministic text from the video so the UI flows are fully usable before Phase 5.
import type { Analysis, Channel, Idea, ScriptBlocks, Video } from "@/lib/types";
import { HOOK_TEMPLATES } from "@/lib/mock/data";
import { compact, uid } from "@/lib/utils";

const formats = ["Breakdown / explainer", "Listicle countdown", "Case study", "Before / after story", "Myth vs fact"];
const visuals = [
  "Talking head, tight framing, kinetic captions, fast push-in at 0:02.",
  "Screen recording with picture-in-picture face cam and arrow call-outs.",
  "B-roll montage with voice-over and bold on-screen headline.",
  "Split screen comparison with a timer overlay.",
];

const h = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

export function buildAnalysis(v: Video, ch: Channel): Omit<Analysis, "status" | "startedAt"> {
  const k = h(v.id);
  const format = formats[k % formats.length];
  return {
    videoId: v.id,
    summary: `“${v.title}” reached ${compact(v.views)} views — ${v.outlier}x @${ch.handle}'s usual performance. It promises a specific, slightly surprising payoff in the first line, then delivers it in short beats. The audience is creators and curious beginners who want a shortcut; the strategy is to trade one clear insight for a follow.`,
    transcript: [
      { t: "0:00", text: `${v.title}.` },
      { t: "0:03", text: "Most people get this wrong, and I did too for a long time." },
      { t: "0:08", text: "Here's the first thing that changed everything for me." },
      { t: "0:15", text: "Second — and this is the part nobody mentions — do it every single day." },
      { t: "0:24", text: "Third, measure it against your own average, not someone else's." },
      { t: `0:${Math.min(59, v.durationSec - 4)}`, text: "Follow for part two, where I show the exact template." },
    ],
    idea: `Core idea: one counter-intuitive lesson, proven with a personal result. Positioning: “I figured it out so you don't have to.”`,
    hook: `Opens with the title line as a spoken claim in under 2 seconds. It creates a curiosity gap (what's the part nobody talks about?) and signals expertise without proof yet, so viewers stay for the payoff.`,
    format: `${format}. Three beats, each 5–8 seconds, with a pattern interrupt between beats and a one-line CTA.`,
    visual: visuals[k % visuals.length],
  };
}

export function buildIdea(v: Video, ch: Channel): Idea {
  return {
    id: uid("idea"),
    videoId: v.id,
    title: `Your take on: ${v.title.toLowerCase()}`,
    positioning: `Speak as someone a few steps ahead of the viewer — like @${ch.handle} does.`,
    format: formats[h(v.id) % formats.length],
    contrast: "Common belief vs. what actually worked for you.",
    personalization: "Swap in a number from your own results and one specific mistake you made.",
    shortlisted: false,
    createdAt: new Date().toISOString(),
  };
}

export function buildScript(topic: string, hook?: string): ScriptBlocks {
  return {
    hook: hook ?? `Nobody tells you this about ${topic.toLowerCase()}…`,
    intro: "I studied the top outliers in my niche this month, and they all do one thing differently.",
    main: "First, they open on a claim, not a greeting. Second, every beat is under eight seconds. Third, they pay off the promise before the viewer can scroll.",
    story: "When I tried this on my last video, my average watch time went up and the comments asked for part two.",
    cta: "Follow so you don't miss part two.",
    ending: "Try it on your next video and tell me how it goes.",
  };
}

export function expandScript(b: ScriptBlocks): ScriptBlocks {
  return {
    ...b,
    intro: `${b.intro} I'll show you exactly what to change, step by step.`,
    main: `${b.main} Here's an example: instead of “Hey guys, today I want to talk about…”, start with the result. Then show the proof on screen while you explain the first step.`,
    story: `${b.story} The surprising part was that it took less effort, not more — I just cut the slow parts.`,
  };
}

export function generateHooks(topic: string, category: string | "All", count = 20): string[] {
  const t = topic.trim() || "your niche";
  const pool = HOOK_TEMPLATES.filter(([c]) => category === "All" || c === category);
  const extras = ["", " (in 30 seconds)", " — the honest version", " before it's too late", " (from someone who failed first)"];
  const out: string[] = [];
  for (let i = 0; out.length < count && i < pool.length * extras.length; i++) {
    const [, tpl] = pool[i % pool.length];
    const line = tpl.replace("{x}", t).replace("{doing x}", `overthinking ${t}`).replace("{result}", "views") + extras[Math.floor(i / pool.length)];
    if (!out.includes(line)) out.push(line);
  }
  return out;
}

export function scriptToText(title: string, b: ScriptBlocks) {
  return [`# ${title}`, "", `HOOK: ${b.hook}`, `INTRO: ${b.intro}`, `MAIN: ${b.main}`, `STORY: ${b.story}`, `CTA: ${b.cta}`, `ENDING: ${b.ending}`].join("\n");
}
