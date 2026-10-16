import { currentSession } from "@/server/auth";
import { ExerciseOverview, InvitationEntry } from "@/components/candidate";
export const dynamic = "force-dynamic";
export default async function ExercisePage() {
  const session = await currentSession("candidate");
  return session ? (
    <ExerciseOverview />
  ) : (
    <InvitationEntry error="Open the private link in your invitation email to access this exercise." />
  );
}
