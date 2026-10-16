import type { LocalParticipant } from "livekit-client";

export async function flushRoleplayTranscript(
  participant: Pick<LocalParticipant, "performRpc">,
  agentIdentity: string,
) {
  const receipt = await participant.performRpc({
    destinationIdentity: agentIdentity,
    method: "flush_transcript",
    payload: "{}",
    // The browser SDK uses milliseconds; the Python SDK uses seconds.
    // Allow the agent's bounded 12-second save plus network headroom.
    responseTimeout: 20_000,
  });
  if (JSON.parse(receipt).saved !== true)
    throw new Error("The customer could not confirm the transcript save.");
}

export async function submitRoleplay({
  status,
  flush,
  submit,
}: {
  status: () => Promise<string | undefined>;
  flush: () => Promise<void>;
  submit: () => Promise<unknown>;
}) {
  // The server may have finalized the deadline while a confirmation was open.
  if ((await status()) === "submitted") return;
  try {
    await flush();
    await submit();
  } catch (error) {
    // Recover a lost acknowledgement or a deadline reached during the save.
    // An active attempt still requires a successful durable transcript flush.
    if ((await status().catch(() => undefined)) === "submitted") return;
    throw error;
  }
}
