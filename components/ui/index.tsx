"use client";

import Link from "next/link";
import { useEffect, useRef, type ButtonHTMLAttributes, type ComponentProps, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Eye, Flame, Instagram, Loader2, Music2, TrendingUp, X, Youtube, type LucideIcon } from "lucide-react";
import { cn, compact, outlier } from "@/lib/utils";
import type { Platform } from "@/lib/types";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
// Buttons match the landing site: navy pill with an inner highlight, electric-blue accent pill.
const variants: Record<Variant, string> = {
  primary: "bg-navy text-white shadow-[inset_0_2px_4px_rgb(255_255_255/0.14)] hover:bg-[#1f3157]",
  accent:
    "bg-accent text-white shadow-[inset_0_2px_4px_rgb(255_255_255/0.2),0_6px_16px_-8px_rgb(11_79_230/0.6)] hover:brightness-110",
  secondary: "border border-line bg-surface text-ink hover:border-accent/40 hover:text-accent",
  ghost: "text-ink hover:bg-accent/[0.06] hover:text-accent",
  danger: "border border-red-200 bg-surface text-danger hover:bg-red-50",
};
const btnBase =
  "inline-flex min-h-9 cursor-pointer select-none items-center justify-center gap-2 rounded-full px-4 font-display text-[13px] font-semibold tracking-[-0.01em] transition disabled:cursor-not-allowed disabled:opacity-45";

export function Button({ variant = "secondary", loading, className, children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button className={cn(btnBase, variants[variant], className)} disabled={loading || p.disabled} {...p}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({ variant = "secondary", className, ...p }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cn(btnBase, variants[variant], className)} {...p} />;
}

export function IconButton({ label, icon: Icon, className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: LucideIcon }) {
  return (
    <button aria-label={label} title={label} className={cn("grid size-9 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-black/5 hover:text-ink", className)} {...p}>
      <Icon className="size-4" />
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border border-line bg-surface", className)}>{children}</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-[26px] font-medium leading-8 tracking-[-0.02em]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-subtle">{hint}</span>}
    </label>
  );
}

const inputCls = "rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15";
// Full width by default; a plain width class from the caller (e.g. "w-32") replaces it instead of losing to it.
const width = (c?: string) => (c && /(^|\s)w-/.test(c) ? "flex-none" : "w-full");
export const Input = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => <input className={cn(inputCls, width(className), "min-h-9", className)} {...p} />;
export const Textarea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className={cn(inputCls, width(className), "leading-6", className)} {...p} />;
export const Select = ({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => <select className={cn(inputCls, width(className), "min-h-9 cursor-pointer", className)} {...p} />;

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: readonly T[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-lg bg-black/[0.05] p-1">
      {options.map((o) => (
        <button
          key={o}
          role="tab"
          aria-selected={value === o}
          onClick={() => onChange(o)}
          className={cn("min-h-8 cursor-pointer rounded-md px-4 text-[13px] font-medium transition", value === o ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink")}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ value, options, onChange }: { value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]">
      {options.map((o) => (
        <button
          key={o}
          role="tab"
          aria-selected={value === o}
          onClick={() => onChange(o)}
          className={cn(
            "-mb-px min-h-10 cursor-pointer whitespace-nowrap border-b-2 px-3 text-[13px] font-semibold transition",
            value === o ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "accent" | "good" | "warn" | "danger"; className?: string }) {
  const tones = {
    neutral: "bg-black/[0.05] text-muted",
    accent: "bg-accent-soft text-accent",
    good: "bg-good-bg text-good",
    warn: "bg-warn-bg text-warn",
    danger: "bg-red-100 text-danger",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold", tones[tone], className)}>{children}</span>;
}

/** The three metric chips used on every video card: outlier (green), views (blue), engagement (orange). */
export function MetricChips({ score, views, engagement, size = "sm" }: { score: number; views: number; engagement: number; size?: "sm" | "md" }) {
  const s = size === "md" ? "px-2 py-1 text-xs" : "px-1.5 py-0.5 text-[11px]";
  return (
    <div className="flex flex-wrap gap-1 tabular">
      <span title="Outlier score" className={cn("inline-flex items-center gap-1 rounded-md font-semibold", s, "bg-good-bg text-good")}><TrendingUp className="size-3" aria-hidden />{outlier(score)}<span className="sr-only"> outlier score</span></span>
      <span title="Views" className={cn("inline-flex items-center gap-1 rounded-md font-semibold", s, "bg-views-bg text-views")}><Eye className="size-3" aria-hidden />{compact(views)}<span className="sr-only"> views</span></span>
      <span title="Engagement" className={cn("inline-flex items-center gap-1 rounded-md font-semibold", s, "bg-warn-bg text-warn")}><Flame className="size-3" aria-hidden />{engagement}%<span className="sr-only"> engagement</span></span>
    </div>
  );
}

export function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  const map = { tiktok: [Music2, "TikTok"], instagram: [Instagram, "Instagram"], youtube: [Youtube, "YouTube"] } as const;
  const [Icon, label] = map[platform];
  return <Icon className={cn("size-3.5", className)} aria-label={label} />;
}

export function Avatar({ name, color, size = 32 }: { name: string; color: string; size?: number }) {
  return (
    <span className="grid flex-none place-items-center rounded-full font-semibold text-white" style={{ background: color, width: size, height: size, fontSize: size * 0.38 }} aria-hidden>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center">
      <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent"><Icon className="size-5" /></span>
      <h3 className="mt-4 font-display text-lg font-medium">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("input,textarea,select,button")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={cn("max-h-[90dvh] w-full overflow-y-auto rounded-2xl bg-surface shadow-2xl", wide ? "max-w-2xl" : "max-w-md")}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-medium">{title}</h2>
          <IconButton label="Close" icon={X} onClick={onClose} />
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-lg", className)} aria-hidden />;
}

export function CreditCost({ n = 1 }: { n?: number }) {
  return <span className="rounded bg-white/20 px-1.5 py-0.5 text-[11px] font-semibold">{n} credit{n === 1 ? "" : "s"}</span>;
}
