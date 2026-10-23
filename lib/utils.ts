export function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

export function compact(n: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function outlier(n: number) {
  return `${n >= 10 ? n.toFixed(0) : n.toFixed(1)}x`;
}

export function ago(iso: string, now = Date.now()) {
  const d = (now - new Date(iso).getTime()) / 86_400_000;
  if (d < 1) return "today";
  if (d < 7) return `${Math.floor(d)}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

export const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 10)}`;

export function download(filename: string, content: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
