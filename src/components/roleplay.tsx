"use client";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useTranscriptions,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import {
  ArrowRight,
  AudioLines,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  PlugZap,
} from "lucide-react";
import { api, Spinner } from "./shared";
import { StageBrief } from "./dashboard";
import type { ExerciseData } from "./candidate";
export type RoleplayHandle = { flush: () => Promise<void> };
const Roleplay = forwardRef<
  RoleplayHandle,
  {
    data: ExerciseData;
    onStarted: () => Promise<void>;
    onError: (s: string) => void;
  }
>(function Roleplay({ data, onStarted, onError }, ref) {
  const [connection, setConnection] = useState<{
      token: string;
      serverUrl: string;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [stream, setStream] = useState<MediaStream | null>(null),
    [devices, setDevices] = useState(false);
  const preview = useRef<HTMLVideoElement | null>(null),
    activeStream = useRef<MediaStream | null>(null),
    call = useRef<RoleplayHandle | null>(null);
  const active =
    data.runs.find((r) => r.stage === "roleplay")?.status === "active";
  useImperativeHandle(ref, () => ({
    flush: async () => {
      if (!call.current)
        throw new Error("Reconnect to the customer before submitting.");
      await call.current.flush();
    },
  }));
  useEffect(
    () => () => activeStream.current?.getTracks().forEach((t) => t.stop()),
    [],
  );
  useEffect(() => {
    if (preview.current && stream) preview.current.srcObject = stream;
  }, [stream]);
  async function checkDevices() {
    setBusy(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });
      activeStream.current?.getTracks().forEach((t) => t.stop());
      activeStream.current = media;
      setStream(media);
      setDevices(true);
    } catch {
      onError(
        "Allow camera and microphone access in your browser, then retry the device check. The timer has not started.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function connect() {
    setBusy(true);
    try {
      const session = await api("/api/livekit/token", {});
      activeStream.current?.getTracks().forEach((t) => t.stop());
      activeStream.current = null;
      setStream(null);
      setConnection(session);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (connection)
    return (
      <LiveKitRoom
        token={connection.token}
        serverUrl={connection.serverUrl}
        connect
        audio
        video
        onError={(e) => onError(e.message)}
        onDisconnected={() => {
          setConnection(null);
          setDevices(false);
          onError(
            "The call disconnected. Reconnect below; your original deadline and saved transcript are preserved.",
          );
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <Call ref={call} data={data} onStarted={onStarted} onError={onError} />
        <RoomAudioRenderer />
      </LiveKitRoom>
    );
  return (
    <div className="workspace-start">
      <div className="start-card">
        <span className="eyebrow">SIMULATION 01 / CUSTOMER CONVERSATION</span>
        <h1>
          {active
            ? "Rejoin your customer."
            : "Understand the need behind the ask."}
        </h1>
        <p>
          Meet Maya Torres, Head of Support at Northstar. You have 15 minutes to
          uncover the problem, align on a pilot, and establish what success
          looks like.
        </p>
        {!data.livekitReady ? (
          <div className="setup-block">
            <h3>
              <PlugZap size={20} />
              The AI customer is not connected yet.
            </h3>
            <p>
              The demo administrator needs to configure LiveKit and deploy the
              Northstar customer agent. Once connected, you can enable your
              camera and microphone and start the conversation. Your timer has
              not started.
            </p>
          </div>
        ) : (
          <>
            <div className="preflight-preview">
              {stream ? (
                <video ref={preview} autoPlay muted playsInline />
              ) : (
                <Camera size={37} />
              )}
              <span>
                {devices
                  ? "Camera and microphone ready"
                  : "Device check · timer not started"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                className="btn btn-outline"
                onClick={checkDevices}
                disabled={busy}
              >
                {busy ? <Spinner /> : <Camera size={15} />}Check camera &
                microphone
              </button>
              <button
                className="btn btn-dark"
                onClick={connect}
                disabled={busy || !devices}
              >
                {busy ? (
                  <Spinner />
                ) : (
                  <>
                    Connect to customer <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
            <p className="fineprint" style={{ marginTop: 15 }}>
              The conversation timer starts after you connect and choose “Begin
              conversation.”
            </p>
          </>
        )}
        <StageBrief stage="roleplay" />
      </div>
    </div>
  );
});
const Call = forwardRef<
  RoleplayHandle,
  {
    data: ExerciseData;
    onStarted: () => Promise<void>;
    onError: (s: string) => void;
  }
>(function Call({ data, onStarted, onError }, ref) {
  const room = useRoomContext(),
    participants = useParticipants(),
    { localParticipant, isMicrophoneEnabled, isCameraEnabled, cameraTrack } =
      useLocalParticipant(),
    liveText = useTranscriptions();
  const agent = participants.find((p) => p.isAgent),
    [starting, setStarting] = useState(false),
    [waited, setWaited] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 25000);
    return () => clearTimeout(t);
  }, []);
  const active =
    data.runs.find((r) => r.stage === "roleplay")?.status === "active";
  useImperativeHandle(
    ref,
    () => ({
      flush: async () => {
        if (!agent)
          throw new Error(
            "The AI customer is not connected. Reconnect before submitting.",
          );
        await room.localParticipant.performRpc({
          destinationIdentity: agent.identity,
          method: "flush_transcript",
          payload: "{}",
          responseTimeout: 15,
        });
      },
    }),
    [agent, room],
  );
  return (
    <div className="roleplay-shell">
      <div className="call-surface">
        <div className="call-title">
          <span className="green-dot" />
          NORTHSTAR SUPPORT · LIVE CUSTOMER ROLEPLAY
        </div>
        <div className="customer-presence">
          <div className="customer-orb">✳</div>
          <h2>Maya Torres</h2>
          <p>Head of Support · Northstar</p>
          <span className="agent-state">
            <AudioLines size={13} />
            {!agent
              ? "Connecting to your customer…"
              : active
                ? agent.attributes["lk.agent.state"] || "Connected"
                : "Customer ready · timer not started"}
          </span>
        </div>
        <div className="camera-preview">
          {cameraTrack && isCameraEnabled ? (
            <VideoTrack
              trackRef={{
                participant: localParticipant,
                publication: cameraTrack,
                source: Track.Source.Camera,
              }}
            />
          ) : (
            <div className="camera-off">
              <CameraOff size={22} />
            </div>
          )}
          <span>You</span>
        </div>
        {!agent && waited && (
          <div className="agent-unavailable" role="status">
            <p>
              The customer agent has not joined. Ask the demo administrator to
              check the LiveKit agent deployment, then reconnect.{" "}
              {active
                ? "Your original timer is still running."
                : "Your timer has not started."}
            </p>
            <button
              className="btn btn-outline"
              onClick={() => room.disconnect()}
            >
              Reconnect customer
            </button>
          </div>
        )}
        <div className="call-controls">
          <button
            aria-label={
              isMicrophoneEnabled ? "Mute microphone" : "Enable microphone"
            }
            className={!isMicrophoneEnabled ? "off" : ""}
            onClick={() =>
              localParticipant
                .setMicrophoneEnabled(!isMicrophoneEnabled)
                .catch((e) => onError(e.message))
            }
          >
            {isMicrophoneEnabled ? <Mic size={19} /> : <MicOff size={19} />}
          </button>
          <button
            aria-label={isCameraEnabled ? "Turn camera off" : "Enable camera"}
            className={!isCameraEnabled ? "off" : ""}
            onClick={() =>
              localParticipant
                .setCameraEnabled(!isCameraEnabled)
                .catch((e) => onError(e.message))
            }
          >
            {isCameraEnabled ? <Camera size={19} /> : <CameraOff size={19} />}
          </button>
          {!active && (
            <button
              className="btn"
              disabled={
                !agent || !isMicrophoneEnabled || !isCameraEnabled || starting
              }
              onClick={async () => {
                setStarting(true);
                try {
                  await api("/api/stages/roleplay/start", {});
                  await onStarted();
                } catch (e) {
                  onError((e as Error).message);
                } finally {
                  setStarting(false);
                }
              }}
            >
              {starting ? <Spinner /> : "Begin conversation"}
            </button>
          )}
        </div>
      </div>
      <aside className="live-transcript">
        <h3>Conversation transcript</h3>
        <p>
          Captured as you talk. This context follows you into Solution Design.
        </p>
        <div className="transcript-list">
          {data.transcript.map((s) => (
            <div
              key={s.segment_id}
              className={`transcript-message ${s.speaker}`}
            >
              <div>
                <strong>{s.speaker === "customer" ? "Maya" : "You"}</strong>
                <span>Saved</span>
              </div>
              <p>{s.text}</p>
            </div>
          ))}
          {liveText.length > 0 && (
            <div className="transcript-message">
              <div>
                <strong>Live caption</strong>
                <span>Transcribing…</span>
              </div>
              <p>{liveText[liveText.length - 1].text}</p>
            </div>
          )}
          {!data.transcript.length && !liveText.length && (
            <p className="fineprint">
              Your transcript will appear once the conversation begins.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
});
export default Roleplay;
