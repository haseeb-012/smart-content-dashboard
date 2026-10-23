"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";
import { useAsyncAction, useStore } from "@/lib/store";
import { Button, ButtonLink, Card, Field, Input } from "@/components/ui";
import { cn } from "@/lib/utils";

// Onboarding: signup → first workspace → optional social connect → dashboard (PRD §9.1).
export default function Onboarding() {
  const router = useRouter();
  const rawNext = useSearchParams().get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;
  const run = useAsyncAction();
  const { state, renameWorkspace, createWorkspace, live } = useStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const saveWorkspace = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    // Live: the first workspace is created on the server. Demo: rename the seeded one.
    const ok = await run(async () => {
      if (live && state.workspaces.length === 0) await createWorkspace(name.trim());
      else await renameWorkspace(state.activeId, name.trim());
      return true;
    });
    setBusy(false);
    if (ok) setStep(1);
  };
  const steps = ["Name your workspace", "Connect an account (optional)", "You're ready"];

  return (
    <div className="mx-auto max-w-lg py-6">
      <ol className="mb-6 flex items-center gap-2" aria-label="Onboarding progress">
        {steps.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span className={cn("grid size-7 flex-none place-items-center rounded-full text-xs font-bold", i < step ? "bg-good text-white" : i === step ? "bg-accent text-white" : "bg-black/10 text-muted")}>{i < step ? <Check className="size-4" /> : i + 1}</span>
            {i < steps.length - 1 && <span className="h-px flex-1 bg-line" />}
          </li>
        ))}
      </ol>
      <Card className="p-6">
        <h1 className="font-display text-xl font-medium">{steps[step]}</h1>
        {step === 0 && (
          <form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); void saveWorkspace(); }}>
            <Field label="Workspace name" hint="One workspace per niche or client. You can add more later."><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fitness content" /></Field>
            <Button type="submit" variant="primary" disabled={!name.trim()} loading={busy}>Continue</Button>
          </form>
        )}
        {step === 1 && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted">Verifying your own TikTok, Instagram or YouTube unlocks personal analytics. Everything else works without it.</p>
            <div className="flex gap-2">
              <ButtonLink href="/settings?tab=Social%20verification" variant="primary">Verify an account</ButtonLink>
              <Button onClick={() => setStep(2)}>Skip for now</Button>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted">You have {state.credits} credits this month. Start by tracking a few channels, then open an outlier and analyze it.</p>
            <div className="flex flex-wrap gap-2">
              {next ? (
                <Button variant="accent" onClick={() => router.push(next)}>Continue to your plan</Button>
              ) : (
                <Button variant="primary" onClick={() => router.push("/channels")}>Add channels</Button>
              )}
              <Button onClick={() => router.push("/dashboard")}>Go to dashboard</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
