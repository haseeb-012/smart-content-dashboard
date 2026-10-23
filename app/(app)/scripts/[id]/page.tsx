import { LIVE } from "@/lib/config";
import { LiveScriptEditor } from "@/components/features/live-create";
import { ScriptEditor } from "./script-editor";

export default async function ScriptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return LIVE ? <LiveScriptEditor id={id} /> : <ScriptEditor id={id} />;
}
