import {
  AccessToken,
  RoomServiceClient,
  AgentDispatchClient,
} from "livekit-server-sdk";
import { ParticipantInfo_Kind, TrackType, JobStatus } from "@livekit/protocol";
import { AppError } from "@/lib/domain";
export function livekitConfigured() {
  return [
    "LIVEKIT_URL",
    "LIVEKIT_API_KEY",
    "LIVEKIT_API_SECRET",
    "AGENT_CALLBACK_SECRET",
  ].every((k) => !!process.env[k]);
}
export function roomName(id: string) {
  return `certiio-${id}`;
}
export function roomClient() {
  if (!livekitConfigured())
    throw new AppError(
      503,
      "LiveKit needs to be configured before this conversation can start.",
    );
  return new RoomServiceClient(
    process.env.LIVEKIT_URL!.replace("wss:", "https:"),
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
  );
}
export async function createRoomToken(id: string, name: string) {
  const client = roomClient();
  const room = roomName(id);
  await client.createRoom({
    name: room,
    emptyTimeout: 120,
    maxParticipants: 2,
  });
  const dispatcher = new AgentDispatchClient(
    process.env.LIVEKIT_URL!.replace("wss:", "https:"),
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
  );
  const agentName = process.env.LIVEKIT_AGENT_NAME || "certiio-northstar-customer";
  const dispatches = await dispatcher.listDispatch(room);
  // LiveKit also creates an unnamed automatic dispatch with no jobs. It does
  // not target our named customer and must not prevent an explicit dispatch.
  const pendingOrRunning = dispatches.some(
    (d) =>
      d.agentName === agentName &&
      (!d.state?.jobs.length ||
        d.state.jobs.some(
          (j) =>
            !j.state ||
            j.state.status === JobStatus.JS_PENDING ||
            j.state.status === JobStatus.JS_RUNNING,
        )),
  );
  if (!pendingOrRunning)
    await dispatcher.createDispatch(room, agentName, {
      metadata: JSON.stringify({
        invitationId: id,
        appUrl: process.env.APP_URL,
      }),
    });
  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    { identity: `candidate-${id}`, name, ttl: "20m" },
  );
  token.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  return { serverUrl: process.env.LIVEKIT_URL, token: await token.toJwt() };
}
export async function verifyRoomReady(id: string) {
  const participants = await roomClient().listParticipants(roomName(id));
  const candidate = participants.find((p) => p.identity === `candidate-${id}`);
  if (!participants.some((p) => p.kind === ParticipantInfo_Kind.AGENT))
    throw new AppError(409, "Waiting for the AI customer to connect.");
  if (
    !candidate?.tracks.some((t) => t.type === TrackType.AUDIO && !t.muted) ||
    !candidate.tracks.some((t) => t.type === TrackType.VIDEO && !t.muted)
  )
    throw new AppError(
      409,
      "Enable your camera and microphone before starting the conversation.",
    );
}
export async function stopRoom(id: string) {
  if (livekitConfigured())
    await roomClient()
      .deleteRoom(roomName(id))
      .catch(() => {});
}
