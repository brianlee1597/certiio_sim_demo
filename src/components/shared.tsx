"use client";
import { ArrowUpRight, Check, Loader2, ShieldCheck } from "lucide-react";
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <span className={`brand ${light ? "brand-light" : ""}`}>
      certiio<span>.</span>
    </span>
  );
}
export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "amber" | "dark";
}) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}
export function Spinner() {
  return <Loader2 className="spin" size={17} />;
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <ShieldCheck size={30} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export async function api<T = any>(url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok)
    throw new Error(data.error || "Something went wrong. Please retry.");
  return data;
}
export function Saved({
  status,
  onRetry,
}: {
  status: string;
  onRetry?: () => void;
}) {
  return (
    <span className={`save-status ${status === "error" ? "save-error" : ""}`}>
      {status === "saving" ? (
        <>
          <Spinner />
          Saving…
        </>
      ) : status === "error" ? (
        <>
          Not saved <button onClick={onRetry}>Retry</button>
        </>
      ) : (
        <>
          <Check size={14} />
          All changes saved
        </>
      )}
    </span>
  );
}
export function Footer() {
  return (
    <footer className="page-footer">
      <span>Built around the work.</span>
      <span>
        Powered by <Brand /> <ArrowUpRight size={13} />
      </span>
    </footer>
  );
}
