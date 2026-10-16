import test, { before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { localDatabase, setTestDatabase, type DB } from "../src/server/db";
import {
  createInvitation,
  exercise,
  runsFor,
  saveStage,
  startStage,
  submitStage,
  persistSegment,
} from "../src/server/simulations";
import { inviteToken, validateInvite } from "../src/server/auth";
import { candidates } from "../src/lib/candidates";
import {
  stageAllowed,
  weightedScore,
  remainingSeconds,
  type Run,
} from "../src/lib/domain";
import { livekitConfigured, createRoomToken } from "../src/server/livekit";
let db: DB;
before(async () => {
  process.env.SESSION_SECRET =
    "test-only-session-secret-with-at-least-32-characters";
  db = await localDatabase();
  setTestDatabase(db);
});
const invite = () =>
  createInvitation("Test Candidate", `test-${randomUUID()}@example.invalid`);
async function completedConversation() {
  const inv = await invite();
  const run = await startStage(inv.id, "roleplay");
  for (const speaker of ["candidate", "customer"] as const)
    await persistSegment(inv.id, {
      segment_id: randomUUID(),
      speaker,
      text: `Saved ${speaker} turn`,
      occurred_at: run.started_at!,
      final: true,
    });
  await submitStage(inv.id, "roleplay");
  return inv;
}
async function readyArtifact(id: string, stage: "design" | "delivery") {
  const artifact = randomUUID();
  await db.query(
    "INSERT INTO artifacts(id,invite_id,stage,kind,pathname,name,size,status,created_at) VALUES($1,$2,$3,$4,$5,'fixture',10,'ready',$6)",
    [
      artifact,
      id,
      stage,
      stage === "design" ? "board" : "project",
      randomUUID(),
      Date.now(),
    ],
  );
  return artifact;
}
test("100 fictional applicants have unique identities, stable ranking, and matching weighted scores", () => {
  assert.equal(candidates.length, 100);
  assert.equal(new Set(candidates.map((c) => c.name)).size, 100);
  for (let i = 0; i < 100; i++) {
    assert.equal(candidates[i].rank, i + 1);
    assert.equal(candidates[i].overall, weightedScore(candidates[i].scores));
    if (i) assert.ok(candidates[i - 1].overall >= candidates[i].overall);
  }
  assert.ok(new Set(candidates.map((c) => c.profile)).size >= 5);
});
test("invitation tokens are isolated, tamper resistant, and reusable without being consumed by previews", async () => {
  const a = await invite(),
    b = await invite();
  const token = inviteToken(a.id);
  assert.equal((await validateInvite(token)).id, a.id);
  assert.equal((await validateInvite(token)).id, a.id);
  await assert.rejects(
    () => validateInvite(token.replace(a.id, b.id)),
    /invalid/,
  );
  await db.query("UPDATE invitations SET expires_at=$2 WHERE id=$1", [
    a.id,
    Date.now() - 1,
  ]);
  await assert.rejects(() => validateInvite(token), /expired/);
});
test("later stages cannot be started, saved, or submitted through direct requests", async () => {
  const i = await invite();
  assert.equal(stageAllowed(await runsFor(i.id), "design"), false);
  for (const stage of ["design", "delivery"] as const) {
    await assert.rejects(() => startStage(i.id, stage), /previous/);
    await assert.rejects(() => saveStage(i.id, stage, {}, 0), /previous/);
    await assert.rejects(() => submitStage(i.id, stage), /previous/);
  }
});
test("start is idempotent and reconnect cannot reset the authoritative timer", async () => {
  const i = await invite();
  const first = await startStage(i.id, "roleplay"),
    second = await startStage(i.id, "roleplay");
  assert.equal(first.deadline, second.deadline);
  assert.equal(first.deadline! - first.started_at!, 900000);
  assert.equal(remainingSeconds(first, first.started_at! + 5000), 895);
});
test("transcripts are immediately available, deduplicated, and final text is immutable", async () => {
  const i = await invite(),
    run = await startStage(i.id, "roleplay");
  const segment = {
    segment_id: "turn-1",
    speaker: "candidate" as const,
    text: "Pilot scope",
    occurred_at: run.started_at!,
    final: false,
  };
  await persistSegment(i.id, segment);
  await persistSegment(i.id, {
    ...segment,
    text: "A small, measured pilot.",
    final: true,
  });
  await persistSegment(i.id, {
    ...segment,
    text: "Replacement not allowed",
    final: true,
  });
  const d = await exercise(i.id);
  assert.equal(d.transcript.length, 1);
  assert.equal(d.transcript[0].text, "A small, measured pilot.");
  await assert.rejects(
    () =>
      persistSegment(i.id, {
        ...segment,
        segment_id: "late",
        occurred_at: run.deadline! + 1,
      }),
    /outside/,
  );
});
test("roleplay requires saved conversation from both participants", async () => {
  const i = await invite();
  await startStage(i.id, "roleplay");
  await assert.rejects(() => submitStage(i.id, "roleplay"), /both sides/);
});
test("submitting roleplay unlocks design and produces one immutable receipt", async () => {
  const i = await completedConversation();
  const first = (await runsFor(i.id)).find((r) => r.stage === "roleplay")!;
  const repeated = await submitStage(i.id, "roleplay");
  assert.equal(repeated.submitted_at, first.submitted_at);
  assert.equal(repeated.revision, first.revision);
  const design = await startStage(i.id, "design");
  assert.equal(design.deadline! - design.started_at!, 1800000);
  await assert.rejects(
    () => saveStage(i.id, "roleplay", {}, first.revision),
    /not active/,
  );
});
test("autosave restores board and notes; stale revisions cannot overwrite another save", async () => {
  const i = await completedConversation();
  await startStage(i.id, "design");
  const updated = await saveStage(
    i.id,
    "design",
    { snapshot: { document: { store: {} } }, notes: "Tenant-scoped retrieval" },
    0,
  );
  assert.equal(updated.revision, 1);
  await assert.rejects(
    () => saveStage(i.id, "design", { notes: "stale" }, 0),
    /another tab/,
  );
  const d = await exercise(i.id);
  assert.equal(
    d.runs.find((r) => r.stage === "design")!.payload.notes,
    "Tenant-scoped retrieval",
  );
});
test("deadline freezes the last durable evidence and unlocks the next stage", async () => {
  const i = await completedConversation();
  await startStage(i.id, "design");
  await saveStage(
    i.id,
    "design",
    { snapshot: { document: { store: {} } }, notes: "Saved before deadline" },
    0,
  );
  const deadline = Date.now() - 1000;
  await db.query(
    "UPDATE stage_runs SET deadline=$2 WHERE invite_id=$1 AND stage=$3",
    [i.id, deadline, "design"],
  );
  const data = await exercise(i.id);
  const run = data.runs.find((r) => r.stage === "design")!;
  assert.equal(run.status, "submitted");
  assert.equal(run.submitted_at, deadline);
  assert.equal(run.submission_reason, "time_expired");
  assert.equal(run.payload.notes, "Saved before deadline");
  await assert.rejects(
    () => saveStage(i.id, "design", { notes: "Late edit" }, run.revision),
    /not active/,
  );
  assert.equal(stageAllowed(data.runs, "delivery"), true);
});
test("missing, failed, or another candidate’s artifact cannot unlock the next stage", async () => {
  const a = await completedConversation(),
    b = await completedConversation();
  await startStage(a.id, "design");
  await assert.rejects(() => submitStage(a.id, "design"), /snapshot/);
  const foreign = await readyArtifact(b.id, "design");
  await saveStage(
    a.id,
    "design",
    { snapshot: { x: 1 }, imageArtifactId: foreign },
    0,
  );
  await assert.rejects(() => submitStage(a.id, "design"), /not finished/);
  const own = await readyArtifact(a.id, "design");
  await db.query("UPDATE artifacts SET status='uploaded' WHERE id=$1", [own]);
  await saveStage(
    a.id,
    "design",
    { snapshot: { x: 1 }, imageArtifactId: own },
    1,
  );
  await assert.rejects(() => submitStage(a.id, "design"), /not finished/);
  await db.query("UPDATE artifacts SET status='ready' WHERE id=$1", [own]);
  assert.equal((await submitStage(a.id, "design")).status, "submitted");
});
test("delivery has no deadline, requires all notes and a durable ZIP, and ends the exercise", async () => {
  const i = await completedConversation();
  await startStage(i.id, "design");
  const image = await readyArtifact(i.id, "design");
  await saveStage(
    i.id,
    "design",
    { snapshot: { x: 1 }, imageArtifactId: image },
    0,
  );
  await submitStage(i.id, "design");
  const run = await startStage(i.id, "delivery");
  assert.equal(run.deadline, null);
  await assert.rejects(() => submitStage(i.id, "delivery"), /ZIP/);
  const zip = await readyArtifact(i.id, "delivery");
  await saveStage(i.id, "delivery", { projectArtifactId: zip }, 0);
  await assert.rejects(() => submitStage(i.id, "delivery"), /notes/);
  await saveStage(
    i.id,
    "delivery",
    {
      projectArtifactId: zip,
      implementation: "Built a slice.",
      evaluation: "19/20 pass; known limitation.",
      handoff: "Run npm test. Scope changed because of evidence.",
    },
    1,
  );
  const result = await submitStage(i.id, "delivery");
  assert.equal(result.status, "submitted");
  assert.ok((await exercise(i.id)).runs.every((r) => r.status === "submitted"));
  assert.equal(
    (await submitStage(i.id, "delivery")).submitted_at,
    result.submitted_at,
  );
});
test("LiveKit is unavailable until credentials are configured; no rehearsal bypass", async () => {
  delete process.env.LIVEKIT_URL;
  assert.equal(livekitConfigured(), false);
  await assert.rejects(
    () => createRoomToken(randomUUID(), "Candidate"),
    /configured/,
  );
});
test("resending sends the same scoped link without resetting progress or expiry", async () => {
  const { sendInvitation, invitationLink } = await import(
    "../src/server/email"
  );
  const original = globalThis.fetch;
  const env = {
    key: process.env.RESEND_API_KEY,
    from: process.env.RESEND_FROM_EMAIL,
  };
  const requests: any[] = [];
  process.env.RESEND_API_KEY = "test-provider-key";
  process.env.RESEND_FROM_EMAIL = "test@example.invalid";
  globalThis.fetch = (async (_url, options) => {
    requests.push(JSON.parse(String(options?.body)));
    return Response.json({ id: "email-fixture" });
  }) as typeof fetch;
  try {
    const i = await invite();
    const started = await startStage(i.id, "roleplay");
    const before = invitationLink(i.id);
    await sendInvitation(i);
    await sendInvitation(i);
    assert.equal(requests.length, 2);
    assert.ok(requests.every((r) => r.text.includes(before)));
    assert.equal(
      (await validateInvite(inviteToken(i.id))).expires_at,
      i.expires_at,
    );
    assert.equal(
      (await runsFor(i.id)).find((r) => r.stage === "roleplay")!.deadline,
      started.deadline,
    );
    assert.equal(
      (
        await db.query<any>(
          "SELECT email_status FROM invitations WHERE id=$1",
          [i.id],
        )
      ).rows[0].email_status,
      "sent",
    );
  } finally {
    globalThis.fetch = original;
    process.env.RESEND_API_KEY = env.key;
    process.env.RESEND_FROM_EMAIL = env.from;
  }
});
test("failed email remains retryable and never reports a sent status", async () => {
  const { sendInvitation } = await import("../src/server/email");
  const original = globalThis.fetch;
  process.env.RESEND_API_KEY = "test-provider-key";
  process.env.RESEND_FROM_EMAIL = "test@example.invalid";
  globalThis.fetch = (async () =>
    Response.json(
      { message: "Provider temporarily unavailable" },
      { status: 503 },
    )) as typeof fetch;
  try {
    const i = await invite();
    await assert.rejects(() => sendInvitation(i), /temporarily/);
    const stored = (
      await db.query<any>(
        "SELECT email_status,email_error FROM invitations WHERE id=$1",
        [i.id],
      )
    ).rows[0];
    assert.equal(stored.email_status, "failed");
    assert.match(stored.email_error, /temporarily/);
    assert.equal((await runsFor(i.id)).length, 3);
  } finally {
    globalThis.fetch = original;
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
  }
});
test("expired invitation rejects all state mutations", async () => {
  const i = await invite();
  await db.query("UPDATE invitations SET expires_at=$2 WHERE id=$1", [
    i.id,
    Date.now() - 1,
  ]);
  await assert.rejects(() => startStage(i.id, "roleplay"), /expired/);
  await assert.rejects(() => saveStage(i.id, "roleplay", {}, 0), /expired/);
  await assert.rejects(() => submitStage(i.id, "roleplay"), /expired/);
});
