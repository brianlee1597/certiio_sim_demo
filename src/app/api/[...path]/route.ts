import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { get, head } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import {
  AppError,
  STAGES,
  assertStageAllowed,
  type Stage,
  type Invitation,
  type Artifact,
} from "@/lib/domain";
import { getDb } from "@/server/db";
import {
  COOKIE,
  checkOrigin,
  currentSession,
  equal,
  hash,
  newSession,
  rateLimit,
  requireSession,
  validateInvite,
} from "@/server/auth";
import {
  createInvitation,
  exercise,
  expireStages,
  persistSegment,
  runsFor,
  saveStage,
  startStage,
  submitStage,
} from "@/server/simulations";
import { invitationLink, sendInvitation } from "@/server/email";
import {
  createRoomToken,
  livekitConfigured,
  stopRoom,
  verifyRoomReady,
} from "@/server/livekit";
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
const stageSchema = z.enum(STAGES);
async function json(req: Request) {
  if (Number(req.headers.get("content-length") || 0) > 3_000_000)
    throw new AppError(
      413,
      "This save is too large. Keep your board below 3 MB.",
    );
  const text = await req.text();
  if (text.length > 3_000_000)
    throw new AppError(413, "This save is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError(400, "Invalid request.");
  }
}
async function artifactFor(id: string, invitationId: string) {
  const a = (
    await (
      await getDb()
    ).query<Artifact>("SELECT * FROM artifacts WHERE id=$1 AND invite_id=$2", [
      id,
      invitationId,
    ])
  ).rows[0];
  if (!a) throw new AppError(404, "Artifact not found.");
  return a;
}
async function finishArtifact(a: Artifact) {
  const details = await head(a.pathname);
  const limit = a.kind === "project" ? 50 * 1024 * 1024 : 4 * 1024 * 1024;
  if (details.size > limit || details.size !== Number(a.size))
    throw new AppError(
      422,
      "The uploaded file size does not match. Upload the file again.",
    );
  const result = await get(a.pathname, {
    access: "private",
    headers: { Range: "bytes=0-7" },
    useCache: false,
  });
  if (!result || result.statusCode !== 200)
    throw new AppError(422, "The uploaded file is not available yet.");
  const reader = result.stream.getReader();
  const chunk = await reader.read();
  await reader.cancel();
  const bytes = chunk.value || new Uint8Array();
  const valid =
    a.kind === "project"
      ? bytes[0] === 0x50 &&
        bytes[1] === 0x4b &&
        (bytes[2] === 3 || bytes[2] === 5 || bytes[2] === 7)
      : bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47;
  if (!valid)
    throw new AppError(
      422,
      a.kind === "project"
        ? "Please upload a valid ZIP archive."
        : "Please upload a valid PNG snapshot.",
    );
  await (
    await getDb()
  ).query("UPDATE artifacts SET status='ready',url=$2 WHERE id=$1", [
    a.id,
    details.url,
  ]);
  return {
    id: a.id,
    name: a.name,
    size: Number(a.size),
    kind: a.kind,
    status: "ready",
  };
}
async function route(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const path = (await context.params).path.join("/");
  const method = req.method;
  // Blob verifies its callback signature. Browser token generation is authenticated inside the hook.
  if (path === "uploads" && method === "POST") {
    const body = (await json(req)) as HandleUploadBody;
    const response = await handleUpload({
      request: req,
      body,
      onBeforeGenerateToken: async (pathname) => {
        checkOrigin(req);
        const session = await requireSession("candidate");
        const a = (
          await (
            await getDb()
          ).query<Artifact>(
            "SELECT * FROM artifacts WHERE pathname=$1 AND invite_id=$2",
            [pathname, session.invite_id],
          )
        ).rows[0];
        if (!a) throw new AppError(403, "Upload not authorized.");
        const run = (await runsFor(a.invite_id)).find(
          (r) => r.stage === a.stage,
        );
        if (
          run?.status !== "active" ||
          (run.deadline && run.deadline < Date.now())
        )
          throw new AppError(409, "This simulation has ended.");
        return {
          allowedContentTypes: [
            a.kind === "project" ? "application/zip" : "image/png",
          ],
          maximumSizeInBytes: Number(a.size),
          validUntil: Date.now() + 15 * 60000,
          addRandomSuffix: false,
          allowOverwrite: false,
          tokenPayload: JSON.stringify({ id: a.id }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const id = JSON.parse(tokenPayload || "{}").id;
        if (id)
          await (
            await getDb()
          ).query(
            "UPDATE artifacts SET status=CASE WHEN status='ready' THEN 'ready' ELSE 'uploaded' END,url=$2 WHERE id=$1 AND pathname=$3",
            [id, blob.url, blob.pathname],
          );
      },
    });
    return NextResponse.json(response);
  }
  // Agent calls never carry browser cookies; use a dedicated shared secret.
  if (path === "agent/transcript" && method === "POST") {
    if (
      !process.env.AGENT_CALLBACK_SECRET ||
      !equal(
        req.headers.get("authorization") || "",
        `Bearer ${process.env.AGENT_CALLBACK_SECRET}`,
      )
    )
      throw new AppError(401, "Agent authentication failed.");
    const event = z
      .object({
        invitationId: z.string().uuid(),
        segment: z.object({
          segment_id: z.string().min(1).max(100),
          speaker: z.enum(["candidate", "customer"]),
          text: z.string().min(1).max(12000),
          occurred_at: z.number(),
          final: z.boolean(),
        }),
      })
      .parse(await json(req));
    await persistSegment(event.invitationId, event.segment);
    return NextResponse.json({ saved: true });
  }
  if (path === "agent/state" && method === "GET") {
    if (
      !process.env.AGENT_CALLBACK_SECRET ||
      !equal(
        req.headers.get("authorization") || "",
        `Bearer ${process.env.AGENT_CALLBACK_SECRET}`,
      )
    )
      throw new AppError(401, "Agent authentication failed.");
    const id = z
      .string()
      .uuid()
      .parse(req.nextUrl.searchParams.get("invitationId"));
    await expireStages(id);
    const run = (await runsFor(id)).find((r) => r.stage === "roleplay");
    const transcript = (
      await (
        await getDb()
      ).query(
        "SELECT segment_id,speaker,text,occurred_at FROM transcript_segments WHERE invite_id=$1 AND final=true ORDER BY occurred_at",
        [id],
      )
    ).rows;
    return NextResponse.json({
      status: run?.status,
      deadline: run?.deadline,
      startedAt: run?.started_at,
      transcript,
    });
  }
  if (method !== "GET") checkOrigin(req);
  if (path === "login" && method === "POST") {
    await rateLimit(
      `login:${req.headers.get("x-forwarded-for")?.split(",")[0] || "local"}`,
      10,
      15 * 60000,
    );
    const body = z
      .object({ password: z.string().max(300) })
      .parse(await json(req));
    if (!process.env.DEMO_ADMIN_PASSWORD)
      throw new AppError(503, "The employer password has not been configured.");
    if (!equal(body.password, process.env.DEMO_ADMIN_PASSWORD))
      throw new AppError(401, "That password doesn’t match. Please try again.");
    await newSession("admin");
    return NextResponse.json({ ok: true });
  }
  if (path === "logout" && method === "POST") {
    const token = (await cookies()).get(`${COOKIE}_admin`)?.value;
    if (token)
      await (
        await getDb()
      ).query("DELETE FROM sessions WHERE token_hash=$1", [hash(token)]);
    (await cookies()).delete(`${COOKIE}_admin`);
    return NextResponse.json({ ok: true });
  }
  if (path === "access" && method === "POST") {
    const body = z
      .object({ token: z.string().max(200) })
      .parse(await json(req));
    const inv = await validateInvite(body.token);
    await newSession("candidate", inv.id, inv.expires_at);
    return NextResponse.json({ ok: true });
  }
  if (path === "admin/invitations") {
    await requireSession("admin");
    if (method === "GET") {
      const db = await getDb();
      await db.query(
        "UPDATE stage_runs SET status='submitted',submitted_at=deadline,submission_reason='time_expired' WHERE status='active' AND deadline<$1",
        [Date.now()],
      );
      const invitations = (
        await db.query<Invitation>(
          "SELECT * FROM invitations ORDER BY created_at DESC",
        )
      ).rows;
      const runs = (
        await db.query(
          "SELECT invite_id,stage,status,submitted_at FROM stage_runs",
        )
      ).rows;
      return NextResponse.json({
        invitations: invitations.map((i) => ({
          ...i,
          link: invitationLink(i.id),
          runs: runs.filter((r) => r.invite_id === i.id),
        })),
      });
    }
    if (method === "POST") {
      await rateLimit("invite-send", 30, 3600000);
      const body = z
        .object({
          name: z.string().trim().min(1).max(100),
          email: z.email().max(254),
        })
        .parse(await json(req));
      const inv = await createInvitation(body.name, body.email.toLowerCase());
      try {
        await sendInvitation(inv);
      } catch (e) {
        return NextResponse.json(
          {
            invitation: inv,
            error: e instanceof Error ? e.message : "Email failed.",
            created: true,
          },
          { status: 502 },
        );
      }
      return NextResponse.json({
        invitation: inv,
        link: invitationLink(inv.id),
      });
    }
  }
  const resend = path.match(/^admin\/invitations\/([^/]+)\/resend$/);
  if (resend && method === "POST") {
    await requireSession("admin");
    await rateLimit("invite-send", 30, 3600000);
    const db = await getDb();
    const inv = (
      await db.query<Invitation>("SELECT * FROM invitations WHERE id=$1", [
        resend[1],
      ])
    ).rows[0];
    if (!inv) throw new AppError(404, "Invitation not found.");
    if (inv.expires_at < Date.now())
      throw new AppError(
        410,
        "This link has expired. Create a new invitation.",
      );
    await sendInvitation(inv);
    return NextResponse.json({ sent: true });
  }
  if (path === "admin/config" && method === "GET") {
    await requireSession("admin");
    return NextResponse.json({
      livekit: livekitConfigured(),
      email: !!process.env.RESEND_API_KEY,
      storage: !!process.env.BLOB_READ_WRITE_TOKEN,
      tldraw: !!process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY,
    });
  }
  if (path === "exercise" && method === "GET") {
    const session = await requireSession("candidate");
    return NextResponse.json({
      ...(await exercise(session.invite_id!)),
      livekitReady: livekitConfigured(),
      boardReady: !!process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY,
      storageReady: !!process.env.BLOB_READ_WRITE_TOKEN,
    });
  }
  if (path === "livekit/token" && method === "POST") {
    const session = await requireSession("candidate");
    const data = await exercise(session.invite_id!);
    if (data.runs.find((r) => r.stage === "roleplay")?.status === "submitted")
      throw new AppError(409, "The conversation is already submitted.");
    await rateLimit(`room:${session.invite_id}`, 30, 3600000);
    return NextResponse.json(
      await createRoomToken(session.invite_id!, data.invitation.name),
    );
  }
  const action = path.match(/^stages\/([^/]+)\/(start|save|submit)$/);
  if (action && method === "POST") {
    const session = await requireSession("candidate"),
      id = session.invite_id!,
      stage = stageSchema.parse(action[1]);
    if (action[2] === "start") {
      if (stage === "roleplay") await verifyRoomReady(id);
      if (
        stage === "design" &&
        (!process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY ||
          !process.env.BLOB_READ_WRITE_TOKEN)
      )
        throw new AppError(
          503,
          "The design workspace needs a tldraw license and artifact storage.",
        );
      return NextResponse.json({ run: await startStage(id, stage) });
    }
    if (action[2] === "save") {
      const body = z
        .object({
          revision: z.number().int().min(0),
          payload: z.record(z.string(), z.unknown()),
        })
        .parse(await json(req));
      const payload =
        stage === "design"
          ? z
              .object({
                snapshot: z.unknown(),
                notes: z.string().max(20000).optional(),
                imageArtifactId: z.string().uuid().optional(),
              })
              .parse(body.payload)
          : stage === "delivery"
            ? z
                .object({
                  projectArtifactId: z.string().uuid().optional(),
                  implementation: z.string().max(20000).optional(),
                  evaluation: z.string().max(20000).optional(),
                  handoff: z.string().max(20000).optional(),
                })
                .parse(body.payload)
            : {};
      return NextResponse.json({
        run: await saveStage(id, stage, payload, body.revision),
      });
    }
    const run = await submitStage(id, stage);
    if (stage === "roleplay") await stopRoom(id);
    return NextResponse.json({ run });
  }
  if (path === "artifacts/init" && method === "POST") {
    const session = await requireSession("candidate");
    if (!process.env.BLOB_READ_WRITE_TOKEN)
      throw new AppError(503, "Artifact storage has not been configured.");
    const body = z
      .object({
        kind: z.enum(["board", "project"]),
        name: z.string().min(1).max(200),
        size: z.number().int().positive(),
      })
      .parse(await json(req));
    const stage: Stage = body.kind === "board" ? "design" : "delivery";
    const runs = await runsFor(session.invite_id!);
    assertStageAllowed(runs, stage);
    const run = runs.find((r) => r.stage === stage)!;
    if (run.status !== "active" || (run.deadline && run.deadline < Date.now()))
      throw new AppError(409, "This workspace is not active.");
    if (body.size > (body.kind === "project" ? 50 : 4) * 1024 * 1024)
      throw new AppError(413, "The file exceeds the upload size limit.");
    await rateLimit(`upload:${session.invite_id}`, 300, 3600000);
    const id = randomUUID();
    const pathname = `${session.invite_id}/${stage}/${id}.${body.kind === "project" ? "zip" : "png"}`;
    await (
      await getDb()
    ).query(
      "INSERT INTO artifacts(id,invite_id,stage,kind,pathname,name,size,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        id,
        session.invite_id,
        stage,
        body.kind,
        pathname,
        body.name,
        body.size,
        Date.now(),
      ],
    );
    return NextResponse.json({ id, pathname });
  }
  const complete = path.match(/^artifacts\/([^/]+)\/complete$/);
  if (complete && method === "POST") {
    const session = await requireSession("candidate");
    const a = await artifactFor(complete[1], session.invite_id!);
    const run = (await runsFor(a.invite_id)).find((r) => r.stage === a.stage)!;
    if (run.status !== "active" || (run.deadline && run.deadline < Date.now()))
      throw new AppError(409, "This workspace has ended.");
    return NextResponse.json(await finishArtifact(a));
  }
  const download = path.match(/^artifacts\/([^/]+)$/);
  if (download && method === "GET") {
    const session = await currentSession();
    if (!session) throw new AppError(401, "Sign in to view this artifact.");
    const db = await getDb();
    const a = (
      await db.query<Artifact>(
        "SELECT * FROM artifacts WHERE id=$1 AND status='ready'",
        [download[1]],
      )
    ).rows[0];
    if (
      !a ||
      (session.role === "candidate" && a.invite_id !== session.invite_id)
    )
      throw new AppError(404, "Artifact not found.");
    const result = await get(a.pathname, { access: "private" });
    if (!result || result.statusCode !== 200)
      throw new AppError(404, "Artifact is unavailable.");
    return new Response(result.stream, {
      headers: {
        "Content-Type": a.kind === "board" ? "image/png" : "application/zip",
        "Content-Disposition": `${a.kind === "board" ? "inline" : "attachment"}; filename="${a.kind === "board" ? "architecture.png" : "solution.zip"}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }
  throw new AppError(404, "Endpoint not found.");
}
async function handler(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const result = await route(req, context);
    result.headers.set("Cache-Control", "no-store");
    return result;
  } catch (e) {
    if (e instanceof AppError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof z.ZodError)
      return NextResponse.json(
        { error: e.issues[0]?.message || "Check the submitted fields." },
        { status: 400 },
      );
    console.error(
      "Request failed:",
      e instanceof Error ? e.message : "Unknown error",
    );
    return NextResponse.json(
      {
        error:
          "This request could not be completed. Your saved work is preserved. Please retry.",
      },
      { status: 500 },
    );
  }
}
export { handler as GET, handler as POST };
