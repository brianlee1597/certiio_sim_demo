import {
  createHmac,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { AppError, type Invitation } from "@/lib/domain";
import { getDb, type DB } from "./db";
export const COOKIE = "certiio_demo_session";
export function secret() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)
    throw new AppError(503, "Session configuration is missing.");
  return process.env.SESSION_SECRET;
}
export function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
export function equal(a: string, b: string) {
  return timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)));
}
export function inviteToken(id: string) {
  return `${id}.${createHmac("sha256", secret()).update(`invite:${id}`).digest("base64url")}`;
}
export async function validateInvite(
  token: string,
  db?: DB,
): Promise<Invitation> {
  const id = token.split(".")[0];
  if (!id || !equal(token, inviteToken(id)))
    throw new AppError(404, "This invitation link is invalid.");
  const inv = (
    await (db || (await getDb())).query<Invitation>(
      "SELECT * FROM invitations WHERE id=$1",
      [id],
    )
  ).rows[0];
  if (!inv) throw new AppError(404, "This invitation link is invalid.");
  if (inv.expires_at < Date.now())
    throw new AppError(
      410,
      "This invitation has expired. Ask the hiring team for a new invitation.",
    );
  return inv;
}
export type Session = {
  role: "admin" | "candidate";
  invite_id: string | null;
  expires_at: number;
};
export async function currentSession(role?: Session["role"]) {
  const jar = await cookies();
  const token = role
    ? jar.get(`${COOKIE}_${role}`)?.value
    : jar.get(`${COOKIE}_admin`)?.value ||
      jar.get(`${COOKIE}_candidate`)?.value;
  if (!token) return null;
  const db = await getDb();
  const session = (
    await db.query<Session>(
      "SELECT role,invite_id,expires_at FROM sessions WHERE token_hash=$1 AND expires_at>$2",
      [hash(token), Date.now()],
    )
  ).rows[0];
  return session || null;
}
export async function requireSession(role: Session["role"]) {
  const session = await currentSession(role);
  if (!session || session.role !== role)
    throw new AppError(
      401,
      role === "admin"
        ? "Sign in to the employer demo."
        : "Open your private invitation to continue.",
    );
  if (role === "candidate") {
    const inv = (
      await (
        await getDb()
      ).query<Invitation>("SELECT * FROM invitations WHERE id=$1", [
        session.invite_id,
      ])
    ).rows[0];
    if (!inv || inv.expires_at < Date.now())
      throw new AppError(410, "Your invitation has expired.");
  }
  return session;
}
export async function newSession(
  role: Session["role"],
  inviteId?: string,
  maxExpiry?: number,
) {
  const token = randomBytes(32).toString("base64url");
  const expires = Math.min(
    Date.now() + (role === "admin" ? 12 * 3600000 : 7 * 86400000),
    maxExpiry || Infinity,
  );
  await (
    await getDb()
  ).query(
    "INSERT INTO sessions(token_hash,role,invite_id,expires_at) VALUES($1,$2,$3,$4)",
    [hash(token), role, inviteId || null, expires],
  );
  (await cookies()).set(`${COOKIE}_${role}`, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expires),
  });
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = new URL(process.env.APP_URL || request.url).origin;
  if (origin && origin !== allowed && origin !== new URL(request.url).origin)
    throw new AppError(403, "Request origin is not allowed.");
  if (request.headers.get("sec-fetch-site") === "cross-site")
    throw new AppError(403, "Cross-site request rejected.");
}
export async function rateLimit(
  key: string,
  maximum: number,
  windowMs: number,
) {
  const now = Date.now();
  const rows = (
    await (
      await getDb()
    ).query<{ count: number }>(
      `INSERT INTO rate_limits(key,count,resets_at) VALUES($1,1,$2)
  ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.resets_at<$3 THEN 1 ELSE rate_limits.count+1 END,
  resets_at=CASE WHEN rate_limits.resets_at<$3 THEN $2 ELSE rate_limits.resets_at END RETURNING count`,
      [key, now + windowMs, now],
    )
  ).rows;
  if (rows[0].count > maximum)
    throw new AppError(
      429,
      "Too many attempts. Please try again in a few minutes.",
    );
}
