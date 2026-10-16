import { randomUUID } from "node:crypto";
import {
  AppError,
  STAGES,
  assertStageAllowed,
  stageInfo,
  type Run,
  type Invitation,
  type Stage,
  type Segment,
  type Artifact,
} from "@/lib/domain";
import { getDb, type DB } from "./db";

export async function createInvitation(name: string, email: string) {
  const db = await getDb();
  const id = randomUUID();
  const now = Date.now();
  return db.transaction(async (tx) => {
    const inv = (
      await tx.query<Invitation>(
        "INSERT INTO invitations(id,name,email,created_at,expires_at) VALUES($1,$2,$3,$4,$5) RETURNING *",
        [id, name, email, now, now + 7 * 86400000],
      )
    ).rows[0];
    for (const stage of STAGES)
      await tx.query("INSERT INTO stage_runs(invite_id,stage) VALUES($1,$2)", [
        id,
        stage,
      ]);
    return inv;
  });
}
export async function runsFor(id: string, db?: DB) {
  return (
    await (db || (await getDb())).query<Run>(
      "SELECT * FROM stage_runs WHERE invite_id=$1",
      [id],
    )
  ).rows;
}
async function lockInvitation(id: string, db: DB) {
  const inv = (
    await db.query<Invitation>(
      "SELECT * FROM invitations WHERE id=$1 FOR UPDATE",
      [id],
    )
  ).rows[0];
  if (!inv) throw new AppError(404, "Invitation not found.");
  if (inv.expires_at < Date.now())
    throw new AppError(410, "This invitation has expired.");
}
export async function expireStages(id: string, db?: DB) {
  const conn = db || (await getDb());
  await conn.query(
    `UPDATE stage_runs SET status='submitted',submitted_at=deadline,submission_reason='time_expired',revision=revision+1 WHERE invite_id=$1 AND status='active' AND deadline<=$2`,
    [id, Date.now()],
  );
}
export async function exercise(id: string) {
  const db = await getDb();
  await expireStages(id, db);
  const [inv, runs, transcript, artifacts] = await Promise.all([
    db.query<Invitation>("SELECT * FROM invitations WHERE id=$1", [id]),
    runsFor(id, db),
    db.query<Segment>(
      "SELECT segment_id,speaker,text,occurred_at,final FROM transcript_segments WHERE invite_id=$1 ORDER BY occurred_at,segment_id",
      [id],
    ),
    db.query<Artifact>(
      "SELECT id,invite_id,stage,kind,pathname,name,size,status FROM artifacts WHERE invite_id=$1 AND status='ready'",
      [id],
    ),
  ]);
  return {
    invitation: inv.rows[0],
    runs,
    transcript: transcript.rows,
    artifacts: artifacts.rows,
    serverNow: Date.now(),
  };
}
export async function startStage(id: string, stage: Stage) {
  return (await getDb()).transaction(async (db) => {
    await lockInvitation(id, db);
    await expireStages(id, db);
    const runs = await runsFor(id, db);
    assertStageAllowed(runs, stage);
    const run = runs.find((r) => r.stage === stage)!;
    if (run.status === "submitted")
      throw new AppError(409, "This simulation is already submitted.");
    if (run.status === "active") return run;
    const now = Date.now(),
      seconds = stageInfo[stage].seconds;
    return (
      await db.query<Run>(
        "UPDATE stage_runs SET status='active',started_at=$3,deadline=$4 WHERE invite_id=$1 AND stage=$2 RETURNING *",
        [id, stage, now, seconds ? now + seconds * 1000 : null],
      )
    ).rows[0];
  });
}
export async function saveStage(
  id: string,
  stage: Stage,
  payload: Record<string, unknown>,
  revision: number,
) {
  return (await getDb()).transaction(async (db) => {
    await lockInvitation(id, db);
    await expireStages(id, db);
    const runs = await runsFor(id, db);
    assertStageAllowed(runs, stage);
    const run = runs.find((r) => r.stage === stage)!;
    if (run.status !== "active")
      throw new AppError(
        409,
        "This simulation is not active. Your last saved work is preserved.",
      );
    if (run.revision !== revision)
      throw new AppError(
        409,
        "This workspace changed in another tab. Reload to use the latest saved version.",
      );
    return (
      await db.query<Run>(
        "UPDATE stage_runs SET payload=$3,revision=revision+1 WHERE invite_id=$1 AND stage=$2 RETURNING *",
        [id, stage, JSON.stringify(payload)],
      )
    ).rows[0];
  });
}
export async function submitStage(id: string, stage: Stage) {
  return (await getDb()).transaction(async (db) => {
    await lockInvitation(id, db);
    await expireStages(id, db);
    const runs = await runsFor(id, db);
    assertStageAllowed(runs, stage);
    const run = runs.find((r) => r.stage === stage)!;
    if (run.status === "submitted") return run;
    if (run.status !== "active")
      throw new AppError(409, "Start the simulation before submitting.");
    if (stage === "roleplay") {
      const transcript = (
        await db.query<Segment>(
          "SELECT speaker FROM transcript_segments WHERE invite_id=$1 AND final=true",
          [id],
        )
      ).rows;
      if (
        !transcript.some((t) => t.speaker === "candidate") ||
        !transcript.some((t) => t.speaker === "customer")
      )
        throw new AppError(
          409,
          "Wait for both sides of your conversation to be saved before submitting.",
        );
    }
    if (
      stage === "design" &&
      (!run.payload.snapshot || !run.payload.imageArtifactId)
    )
      throw new AppError(
        422,
        "Save a drawing and its image snapshot before submitting.",
      );
    if (stage === "delivery") {
      if (!run.payload.projectArtifactId)
        throw new AppError(422, "Upload your project ZIP before submitting.");
      for (const field of ["implementation", "evaluation", "handoff"])
        if (
          typeof run.payload[field] !== "string" ||
          !(run.payload[field] as string).trim()
        )
          throw new AppError(
            422,
            "Complete your implementation, evaluation, and handoff notes.",
          );
    }
    const artifactId =
      stage === "design"
        ? run.payload.imageArtifactId
        : stage === "delivery"
          ? run.payload.projectArtifactId
          : null;
    if (artifactId) {
      const a = (
        await db.query<Artifact>(
          "SELECT * FROM artifacts WHERE id=$1 AND invite_id=$2 AND stage=$3 AND status='ready'",
          [artifactId, id, stage],
        )
      ).rows[0];
      if (!a)
        throw new AppError(
          422,
          "Your artifact has not finished saving. Retry the upload.",
        );
    }
    return (
      await db.query<Run>(
        "UPDATE stage_runs SET status='submitted',submitted_at=$3,submission_reason='candidate',revision=revision+1 WHERE invite_id=$1 AND stage=$2 RETURNING *",
        [id, stage, Date.now()],
      )
    ).rows[0];
  });
}
export async function persistSegment(id: string, segment: Segment) {
  return (await getDb()).transaction(async (db) => {
    await lockInvitation(id, db);
    const run = (await runsFor(id, db)).find((r) => r.stage === "roleplay")!;
    if (run.status !== "active" || !run.started_at)
      throw new AppError(409, "The roleplay is not active.");
    if (
      segment.occurred_at < run.started_at - 2000 ||
      segment.occurred_at > Math.min(Date.now() + 10000, run.deadline!)
    )
      throw new AppError(
        409,
        "Transcript event is outside the simulation window.",
      );
    await db.query(
      `INSERT INTO transcript_segments(invite_id,segment_id,speaker,text,occurred_at,final) VALUES($1,$2,$3,$4,$5,$6)
    ON CONFLICT(invite_id,segment_id) DO UPDATE SET text=EXCLUDED.text,final=EXCLUDED.final WHERE transcript_segments.final=false`,
      [
        id,
        segment.segment_id,
        segment.speaker,
        segment.text,
        segment.occurred_at,
        segment.final,
      ],
    );
  });
}
