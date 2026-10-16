"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Modal } from "@mantine/core";
import {
  ArrowRight,
  AudioLines,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  LockKeyhole,
  Network,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import {
  STAGES,
  stageInfo,
  stageAllowed,
  type Run,
  type Invitation,
  type Segment,
  type Artifact,
  type Stage,
} from "@/lib/domain";
import { api, Brand, Empty, Footer, Pill, Spinner } from "./shared";
export type ExerciseData = {
  invitation: Invitation;
  runs: Run[];
  transcript: Segment[];
  artifacts: Artifact[];
  serverNow: number;
  livekitReady: boolean;
  boardReady: boolean;
  storageReady: boolean;
};
export function CandidateNav({ name }: { name?: string }) {
  return (
    <header className="candidate-nav">
      <Link href="/exercise">
        <Brand />
      </Link>
      <div>
        <Pill>
          <ShieldCheck size={13} />
          Private exercise
        </Pill>
        {name && <small>{name}</small>}
      </div>
    </header>
  );
}
export function InvitationEntry({
  token,
  name,
  error,
}: {
  token?: string;
  name?: string;
  error?: string;
}) {
  const [busy, setBusy] = useState(false),
    [failure, setFailure] = useState("");
  return (
    <div className="candidate-shell">
      <CandidateNav />
      <main className="invitation-page">
        <span className="eyebrow">AI FORWARD DEPLOYED ENGINEER</span>
        <h1>{error ? "Your private exercise" : "Show how you work."}</h1>
        {error ? (
          <>
            <div className="alert error" role="alert">
              {error}
            </div>
            <p>Contact the hiring team if you need a fresh invitation.</p>
          </>
        ) : (
          <>
            <p>
              Hi {name?.split(" ")[0]}, welcome to your work simulation. Meet a
              customer, design a solution, and deliver a working slice. Each
              stage builds on the last.
            </p>
            <div className="invitation-steps">
              {STAGES.map((s) => (
                <div key={s}>
                  <span>{stageInfo[s].number}</span>
                  <strong>{stageInfo[s].title}</strong>
                  <small>{stageInfo[s].time}</small>
                </div>
              ))}
            </div>
            <p>
              You’ll see each brief before you start. Timers only begin when
              you’re ready, and your work is saved as you go.
            </p>
            {failure && <div className="alert error">{failure}</div>}
            <button
              className="btn btn-dark"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api("/api/access", { token });
                  location.replace("/exercise");
                } catch (e) {
                  setFailure((e as Error).message);
                  setBusy(false);
                }
              }}
            >
              {busy ? (
                <Spinner />
              ) : (
                <>
                  Open my exercise <ArrowRight size={16} />
                </>
              )}
            </button>
            <p className="fineprint">
              Opening the overview does not start a timer. This is a Certiio
              demo.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
export function ExerciseOverview() {
  const [data, setData] = useState<ExerciseData | null>(null),
    [error, setError] = useState(""),
    [context, setContext] = useState(false);
  useEffect(() => {
    const load = () =>
      api<ExerciseData>("/api/exercise")
        .then(setData)
        .catch((e) => setError(e.message));
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);
  const done = data?.runs.every((r) => r.status === "submitted");
  return (
    <div className="candidate-shell">
      <CandidateNav name={data?.invitation.name} />
      <main className="candidate-main">
        <div className="candidate-heading">
          <div>
            <span className="eyebrow">YOUR WORK SIMULATION</span>
            <h1>
              {done
                ? "Work submitted. Well done."
                : `Welcome${data ? ", " + data.invitation.name.split(" ")[0] : ""}.`}
            </h1>
            <p>
              {done
                ? "You’ve taken one customer problem from discovery to delivery. Your work and context are saved."
                : "One customer. Three connected challenges. Show us how you discover the problem, design the solution, and make it real."}
            </p>
          </div>
          <Pill tone={done ? "green" : "neutral"}>
            {data
              ? `${data.runs.filter((r) => r.status === "submitted").length} of 3 submitted`
              : "Loading…"}
          </Pill>
        </div>
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        {done && (
          <div className="completion-banner">
            <CheckCircle2 size={32} />
            <div>
              <h3>Your complete submission is ready for review.</h3>
              <p>
                All three simulations are submitted. This real demo attempt is
                ungraded.
              </p>
            </div>
          </div>
        )}
        {data ? (
          <div className="candidate-overview-layout">
            <div className="candidate-stages">
              {STAGES.map((s) => {
                const info = stageInfo[s],
                  run = data.runs.find((r) => r.stage === s)!,
                  locked = !stageAllowed(data.runs, s),
                  Icon =
                    s === "roleplay"
                      ? AudioLines
                      : s === "design"
                        ? Network
                        : PackageCheck;
                return (
                  <article
                    key={s}
                    className={`candidate-stage ${locked ? "locked" : ""}`}
                  >
                    <span className={`stage-icon stage-icon-${s}`}>
                      <Icon size={20} />
                    </span>
                    <div className="candidate-stage-content">
                      <div className="candidate-stage-top">
                        <span className="eyebrow">
                          SIMULATION {info.number}
                        </span>
                        <Pill
                          tone={
                            run.status === "submitted"
                              ? "green"
                              : run.status === "active"
                                ? "amber"
                                : "neutral"
                          }
                        >
                          {run.status === "submitted" ? (
                            <>
                              <Check size={11} />
                              Submitted
                            </>
                          ) : locked ? (
                            <>
                              <LockKeyhole size={10} />
                              Locked
                            </>
                          ) : run.status === "active" ? (
                            "In progress"
                          ) : (
                            "Ready to start"
                          )}
                        </Pill>
                      </div>
                      <h3>{info.title}</h3>
                      <p>{info.description}</p>
                      <div className="candidate-stage-actions">
                        <span>
                          <Clock3 size={13} />
                          {info.time}
                          {s === "delivery" ? " suggested" : ""}
                        </span>
                        {run.status === "submitted" ? (
                          <button
                            className="btn btn-light"
                            onClick={() => setContext(true)}
                          >
                            View context <FileText size={13} />
                          </button>
                        ) : locked ? (
                          <span>Complete the previous simulation</span>
                        ) : (
                          <Link
                            href={`/exercise/${s}`}
                            className="btn btn-dark"
                          >
                            {run.status === "active" ? "Resume" : "View brief"}
                            <ArrowRight size={14} />
                          </Link>
                        )}
                      </div>
                      {run.submission_reason === "time_expired" && (
                        <p className="fineprint">
                          Time elapsed. Your last saved work was submitted
                          automatically.
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            <aside className="candidate-aside">
              <span>✳</span>
              <h3>Meet Northstar.</h3>
              <p>
                A B2B support team needs an AI resolution pilot they can trust.
                Your job is to turn their real needs into a working solution.
              </p>
              <ul>
                <li>
                  <Check size={13} />
                  Your context carries across stages.
                </li>
                <li>
                  <Check size={13} />
                  Your work saves as you go.
                </li>
                <li>
                  <Check size={13} />
                  AI tools are welcome. Own the outcome.
                </li>
                <li>
                  <Check size={13} />
                  Explain tradeoffs, not just answers.
                </li>
              </ul>
            </aside>
          </div>
        ) : (
          !error && (
            <div className="workspace-loading" style={{ padding: 60 }}>
              <Spinner />
              Loading your exercise…
            </div>
          )
        )}
        {done && (
          <div
            style={{
              marginTop: 25,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <button
              className="btn btn-outline"
              onClick={() => setContext(true)}
            >
              Review carried context
            </button>
            <Link href="/?tab=results" className="btn btn-dark">
              Return to employer demo <ArrowRight size={15} />
            </Link>
          </div>
        )}
        <Footer />
      </main>
      {data && (
        <ContextModal
          opened={context}
          close={() => setContext(false)}
          data={data}
          stage="delivery"
        />
      )}
    </div>
  );
}
export function ContextModal({
  opened,
  close,
  data,
  stage,
}: {
  opened: boolean;
  close: () => void;
  data: ExerciseData;
  stage: Stage;
}) {
  const [tab, setTab] = useState("brief");
  useEffect(() => {
    if (opened)
      setTab(
        stage === "roleplay"
          ? "brief"
          : stage === "design"
            ? "transcript"
            : "design",
      );
  }, [opened, stage]);
  const boardRun = data.runs.find((r) => r.stage === "design");
  const imageId = boardRun?.payload.imageArtifactId as string | undefined;
  return (
    <Modal
      opened={opened}
      onClose={close}
      title="Your carried context"
      size="xl"
      centered
    >
      <div className="eyebrow">NORTHSTAR SUPPORT · ONE CONNECTED CHALLENGE</div>
      <nav className="tabs context-tabs">
        {[
          ["brief", "Customer brief"],
          ["transcript", "Conversation"],
          ...(stage === "delivery" ? [["design", "Design snapshot"]] : []),
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={tab === id ? "active" : ""}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "brief" ? (
        <div className="brief-content">
          <h3>A support team ready for a better answer.</h3>
          <p>
            You are the AI Forward Deployed Engineer supporting Northstar, a
            growing B2B software company. Maya Torres, Head of Support, wants to
            explore an AI resolution pilot. Her team is overloaded, and an
            earlier chatbot did not earn their trust.
          </p>
          <h4>Your mission</h4>
          <p>
            Understand the problem before prescribing a solution. Discover the
            workflows, users, data, constraints, and success measures. Carry
            what you learn into a practical architecture and a working slice.
          </p>
          <h4>What you know going in</h4>
          <p>
            The team handles product how-to questions, account questions,
            billing questions, and requests for account changes. Information is
            spread across support documents and account systems. Maya wants a
            useful pilot that her team can confidently adopt.
          </p>
        </div>
      ) : tab === "transcript" ? (
        data.transcript.length ? (
          <div className="transcript-list">
            {data.transcript.map((s) => (
              <div
                key={s.segment_id}
                className={`transcript-message ${s.speaker}`}
              >
                <div>
                  <strong>
                    {s.speaker === "customer"
                      ? "Maya · Customer"
                      : "You · Candidate"}
                  </strong>
                  <span>
                    {new Date(s.occurred_at).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <Empty title="Your conversation appears here">
            The transcript is saved during your live conversation and becomes
            the context for Solution Design.
          </Empty>
        )
      ) : (
        <>
          {imageId ? (
            <img
              src={`/api/artifacts/${imageId}`}
              className="context-image"
              alt="Your submitted solution architecture drawing"
            />
          ) : (
            <Empty title="No drawing snapshot yet">
              Your saved architecture image will appear here after the design
              stage.
            </Empty>
          )}
          {boardRun?.payload.notes && (
            <>
              <h4 style={{ margin: "20px 0 12px" }}>Your decision notes</h4>
              <div className="context-notes">
                {String(boardRun.payload.notes)}
              </div>
            </>
          )}
        </>
      )}
    </Modal>
  );
}
