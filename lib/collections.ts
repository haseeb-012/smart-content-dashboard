// Shared view model for Collections so the same UI renders demo data or the live API.
import type { CSSProperties } from "react";
import type { ApiCollectionCategory, ApiCollectionSummary } from "@/lib/api/client";
import type { Collection } from "@/lib/types";

export const CATEGORY_LABEL: Record<ApiCollectionCategory, Collection["category"]> = {
  formats: "Formats",
  editing_styles: "Editing Styles",
  visual_hooks: "Visual Hooks",
  signature_series: "Signature Series",
};
export const CATEGORY_KEY = Object.fromEntries(
  Object.entries(CATEGORY_LABEL).map(([k, v]) => [v, k]),
) as Record<Collection["category"], ApiCollectionCategory>;

export interface CollectionCardModel {
  slug: string;
  name: string;
  category: Collection["category"];
  sub: string;
  description: string;
  hue: string;
  count: number;
}

const FALLBACK_HUE = "from-[#1a5cff] to-[#0a2a8f]";

/**
 * Cover colours come from the database (e.g. "from-[#3b82f6] to-[#1e3a8a]" or "#3b82f6,#1e3a8a").
 * Tailwind can't generate classes it never saw at build time, so render them as an inline gradient.
 */
export function coverStyle(hue: string): CSSProperties {
  const colors = hue.match(/#[0-9a-fA-F]{3,8}/g) ?? ["#1a5cff", "#0a2a8f"];
  return { backgroundImage: `linear-gradient(135deg, ${(colors.length > 1 ? colors : [...colors, colors[0]]).join(", ")})` };
}

export const fromApi = (c: ApiCollectionSummary): CollectionCardModel => ({
  slug: c.slug,
  name: c.name,
  category: CATEGORY_LABEL[c.category],
  sub: c.sub,
  description: c.description,
  hue: c.cover_hue || FALLBACK_HUE,
  count: c.video_count,
});

export const fromDemo = (c: Collection): CollectionCardModel => ({
  slug: c.slug,
  name: c.name,
  category: c.category,
  sub: c.sub,
  description: c.description,
  hue: c.hue,
  count: c.videoIds.length,
});
