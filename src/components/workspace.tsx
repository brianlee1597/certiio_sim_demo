"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Modal } from "@mantine/core";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
} from "lucide-react";
import { stageInfo, stageAllowed, type Stage } from "@/lib/domain";
import { api, Brand, Spinner } from "./shared";
import { ContextModal, type ExerciseData } from "./candidate";
import { StageBrief } from "./dashboard";
import type { BoardHandle } from "./design-board";
import type { DeliveryHandle } from "./delivery";
import type { RoleplayHandle } from "./roleplay";
const Board = dynamic(() => import("./design-board"), {
  ssr: false,
  loading: () => (
    <div className="workspace-loading">
      <Spinner />
      Opening your board…
    </div>
  ),
});
const Delivery = dynamic(() => import("./delivery"), { ssr: false });
const Roleplay = dynamic(() => import("./roleplay"), { ssr: false });
export function Workspace({ stage }: { stage: Stage }) {
  const [data, setData] = useState<ExerciseData | null>(null),
    [error, setError] = useState(""),
    [context, setContext] = useState(false),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [preparing, setPreparing] = useState(false),
    [now, setNow] = useState(Date.now()),
    [offset, setOffset] = useState(0);
  const board = useRef<BoardHandle | null>(null),
    delivery = useRef<DeliveryHandle | null>(null),
    roleplay = useRef<RoleplayHandle | null>(null),
    initial = useRef(true),
    expiring = useRef(false);
  const info = stageInfo[stage];
  const run = data?.runs.find((r) => r.stage === stage);
  const allowed = data && stageAllowed(data.runs, stage);
  async function refresh() {
    try {
      const d = await api<ExerciseData>("/api/exercise");
      setData(d);
      setOffset(d.serverNow - Date.now());
      if (initial.current) {
        if (
          d.runs.find((r) => r.stage === stage)?.status === "not_started" &&
          stageAllowed(d.runs, stage)
        )
          setContext(true);
        initial.current = false;
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, stage === "roleplay" ? 3000 : 15000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [stage]);
  const remaining = run?.deadline
    ? Math.max(0, Math.ceil((run.deadline - now - offset) / 1000))
    : null;
  useEffect(() => {
    if (run?.status === "active" && remaining === 0 && !expiring.current) {
      expiring.current = true;
      refresh();
    }
  }, [remaining, run?.status]);
  async function start(ready = false) {
    setBusy(true);
    setError("");
    if (stage === "design" && !ready) {
      setPreparing(true);
      return;
    }
    try {
      await api(`/api/stages/${stage}/start`, {});
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setPreparing(false);
    }
  }
  async function submit() {
    setBusy(true);
    setError("");
    try {
      if (stage === "design") await board.current?.save();
      if (stage === "delivery") await delivery.current?.save();
      if (stage === "roleplay") await roleplay.current?.flush();
      await api(`/api/stages/${stage}/submit`, {});
      location.href = "/exercise";
    } catch (e) {
      setError((e as Error).message);
      setConfirm(false);
      setBusy(false);
    }
  }
  return (
    <main className={`workspace-page${stage === "roleplay" ? " workspace-roleplay" : ""}`}>
      <header className="workspace-header">
        <Link href="/exercise">
          <Brand />
        </Link>
        <div className="workspace-breadcrumb">
          <Link href="/exercise">Your exercise</Link>
          <ChevronRight size={13} />
          <strong>
            {info.number} / {info.title}
          </strong>
        </div>
        <div className="workspace-actions">
          {run?.status === "active" && remaining !== null ? (
            <span className={`timer ${remaining < 120 ? "urgent" : ""}`}>
              <Clock3 size={14} />
              {String(Math.floor(remaining / 60)).padStart(2, "0")}:
              {String(remaining % 60).padStart(2, "0")}
            </span>
          ) : (
            <span className="timer">
              <Clock3 size={13} />
              {info.time}
              {stage === "delivery" ? " suggested" : ""}
            </span>
          )}
          <button
            className="btn btn-outline"
            onClick={() => setContext(true)}
            disabled={!data}
          >
            <FileText size={14} />
            Context
          </button>
          {run?.status === "active" && (
            <button
              className="btn btn-dark"
              disabled={busy}
              onClick={() => setConfirm(true)}
            >
              {busy ? (
                <Spinner />
              ) : (
                <>
                  Submit <ArrowRight size={14} />
                </>
              )}
            </button>
          )}
        </div>
      </header>
      {error && (
        <div className="workspace-error" role="alert">
          <span>{error}</span>
          <button
            onClick={() => {
              setError("");
              refresh();
            }}
          >
            Dismiss & refresh
          </button>
        </div>
      )}
      <div className="workspace-body" aria-busy={busy}>
        {!data ? (
          <div className="workspace-loading">
            <Spinner />
            Loading your workspace…
          </div>
        ) : !allowed ? (
          <div className="finish-panel">
            <FileText size={35} />
            <h2>One step at a time.</h2>
            <p>Complete the previous simulation to unlock {info.title}.</p>
            <Link href="/exercise" className="btn btn-dark">
              <ArrowLeft size={15} />
              Back to exercise
            </Link>
          </div>
        ) : run?.status === "submitted" ? (
          <div className="finish-panel">
            <CheckCircle2 size={40} />
            <h2>{info.title} submitted.</h2>
            <p>
              {run.submission_reason === "time_expired"
                ? "Your time is up. The last saved version of your work has been submitted."
                : "Your work is saved and the next step is ready."}
            </p>
            <Link href="/exercise" className="btn btn-dark">
              Back to exercise <ArrowRight size={15} />
            </Link>
          </div>
        ) : stage === "roleplay" ? (
          <Roleplay
            ref={roleplay}
            data={data}
            onStarted={refresh}
            onError={setError}
          />
        ) : run?.status === "not_started" ? (
          <div className="workspace-start">
            {preparing && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0,
                  pointerEvents: "none",
                }}
                aria-hidden="true"
              >
                <Board
                  run={run!}
                  onError={(message) => {
                    setError(message);
                    setBusy(false);
                    setPreparing(false);
                  }}
                  onReady={() => start(true)}
                />
              </div>
            )}
            <div className="start-card">
              <span className="eyebrow">
                SIMULATION {info.number} / {info.time}
              </span>
              <h1>
                {stage === "design"
                  ? "Turn discovery into a design."
                  : "Build the solution that matters."}
              </h1>
              <p>
                {stage === "design"
                  ? "Your 30-minute timer starts when you open the board. Your transcript is always available from Context."
                  : "Download the starter, work locally, and return to submit your project ZIP. There is no enforced countdown."}
              </p>
              <button
                className="btn btn-dark"
                onClick={() => start()}
                disabled={busy}
              >
                {busy ? (
                  <Spinner />
                ) : (
                  <>
                    Start {info.title.toLowerCase()}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
              <StageBrief stage={stage} />
            </div>
          </div>
        ) : stage === "design" ? (
          <Board key={run!.status} ref={board} run={run!} onError={setError} />
        ) : (
          <Delivery ref={delivery} run={run!} onError={setError} />
        )}
      </div>
      {data && (
        <ContextModal
          opened={context}
          close={() => setContext(false)}
          data={data}
          stage={stage}
        />
      )}
      <Modal
        opened={confirm}
        onClose={() => !busy && setConfirm(false)}
        title={`Submit ${info.title.toLowerCase()}?`}
        centered
        closeOnClickOutside={!busy}
        closeOnEscape={!busy}
        withCloseButton={!busy}
      >
        <div className="brief-content">
          <p>
            {stage === "delivery"
              ? "This will complete your exercise and save the project and notes for review."
              : "Your work will be saved, this stage will become read-only, and the next simulation will unlock."}
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
              marginTop: 25,
            }}
          >
            <button
              className="btn btn-outline"
              disabled={busy}
              onClick={() => setConfirm(false)}
            >
              Keep working
            </button>
            <button className="btn btn-dark" disabled={busy} onClick={submit}>
              {busy ? (
                <>
                  <Spinner />
                  Saving submission…
                </>
              ) : (
                <>
                  Submit & continue <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
