import { validateInvite } from "@/server/auth";
import { InvitationEntry } from "@/components/candidate";
export const dynamic = "force-dynamic";
export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  try {
    const invitation = await validateInvite(token);
    return <InvitationEntry token={token} name={invitation.name} />;
  } catch (e) {
    return (
      <InvitationEntry
        error={
          e instanceof Error ? e.message : "This invitation is unavailable."
        }
      />
    );
  }
}
