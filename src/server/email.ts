import { getDb } from "./db";
import { inviteToken } from "./auth";
import { AppError, type Invitation } from "@/lib/domain";
const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function invitationLink(id: string) {
  return `${process.env.APP_URL || "http://localhost:3000"}/invite/${inviteToken(id)}`;
}
export async function sendInvitation(inv: Invitation) {
  const db = await getDb();
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL)
    throw new AppError(503, "Email delivery is not configured.");
  await db.query(
    "UPDATE invitations SET email_status='sending',email_error=NULL WHERE id=$1",
    [inv.id],
  );
  try {
    const url = invitationLink(inv.id);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `invite-${inv.id}-${Math.floor(Date.now() / 60000)}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [inv.email],
        subject: "Your AI FDE work simulation · Certiio",
        html: `<div style="background:#f1f0e4;padding:40px;font-family:Arial,sans-serif;color:#121812"><div style="max-width:560px;margin:auto"><h2 style="letter-spacing:-1px">certiio<span style="color:#4eaa26">.</span></h2><p style="font-size:12px;letter-spacing:2px">YOUR PRIVATE INVITATION</p><h1>Show how you work.</h1><p>Hi ${escapeHtml(inv.name)},</p><p>You’re invited to the AI Forward Deployed Engineer work simulation. Meet your customer, design a solution, then deliver a working slice.</p><div style="background:#fafaf5;padding:24px;border-radius:16px;line-height:2">01 · Customer Roleplay — 15 minutes<br/>02 · Solution Design — 30 minutes<br/>03 · Solution Delivery — approximately 2 hours</div><p>This is a Certiio demo. Your link is private and expires in 7 days. Opening it does not start a timer.</p><p style="padding:16px 0"><a href="${url}" style="background:#4eaa26;color:#121812;padding:16px 24px;border-radius:30px;text-decoration:none;font-weight:bold">Open your exercise →</a></p><p style="font-size:12px;color:#686e61">Your work carries forward. Complete each simulation in sequence.</p></div></div>`,
        text: `Hi ${inv.name},\n\nYour private AI FDE work simulation is ready.\n1. Customer Roleplay — 15 minutes\n2. Solution Design — 30 minutes\n3. Solution Delivery — approximately 2 hours\n\nOpen your exercise: ${url}\n\nThis demo invitation expires in 7 days. Opening the link does not start a timer.`,
      }),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message || "Email provider rejected the message.");
    await db.query(
      "UPDATE invitations SET email_status='sent',email_id=$2,email_sent_at=$3 WHERE id=$1",
      [inv.id, data.id, Date.now()],
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Email delivery failed.";
    await db.query(
      "UPDATE invitations SET email_status='failed',email_error=$2 WHERE id=$1",
      [inv.id, message],
    );
    throw new AppError(502, message);
  }
}
