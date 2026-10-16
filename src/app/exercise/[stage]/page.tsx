import { currentSession } from "@/server/auth";
import { STAGES, type Stage } from "@/lib/domain";
import { notFound } from "next/navigation";
import { InvitationEntry } from "@/components/candidate";
import { Workspace } from "@/components/workspace";
export const dynamic = "force-dynamic";
export default async function StagePage({
  params,
}: {
  params: Promise<{ stage: string }>;
}) {
  const { stage } = await params;
  if (!STAGES.includes(stage as Stage)) notFound();
  const session = await currentSession("candidate");
  return session ? (
    <Workspace stage={stage as Stage} />
  ) : (
    <InvitationEntry error="Open your private invitation to continue this simulation." />
  );
}
