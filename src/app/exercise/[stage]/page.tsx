import { currentSession } from "@/server/auth";
import { STAGES, stageAllowed, type Stage } from "@/lib/domain";
import { notFound, redirect } from "next/navigation";
import { InvitationEntry } from "@/components/candidate";
import { Workspace } from "@/components/workspace";
import { expireStages, runsFor } from "@/server/simulations";
export const dynamic = "force-dynamic";
export default async function StagePage({
  params,
}: {
  params: Promise<{ stage: string }>;
}) {
  const { stage } = await params;
  if (!STAGES.includes(stage as Stage)) notFound();
  const session = await currentSession("candidate");
  if (!session)
    return (
      <InvitationEntry error="Open your private invitation to continue this simulation." />
    );
  await expireStages(session.invite_id!);
  if (!stageAllowed(await runsFor(session.invite_id!), stage as Stage))
    redirect("/exercise");
  return <Workspace stage={stage as Stage} />;
}
