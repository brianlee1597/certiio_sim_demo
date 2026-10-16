"use client";
import { useState } from "react";
import {
  ArrowRight,
  AudioLines,
  Network,
  PackageCheck,
  LockKeyhole,
} from "lucide-react";
import { Brand, api, Spinner } from "./shared";
export function Login() {
  const [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="login-page">
      <div className="login-form">
        <Brand />
        <div>
          <span className="eyebrow">THE WORK SPEAKS FOR ITSELF</span>
          <h1>
            Meet your next
            <br />
            great builder.
          </h1>
          <p className="muted lead">
            One customer. Three connected simulations.
            <br />A clearer picture of who can deliver.
          </p>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api("/api/login", { password });
              location.href = "/";
            } catch (e) {
              setError((e as Error).message);
              setBusy(false);
            }
          }}
        >
          <label htmlFor="password">Employer demo password</label>
          <div className="input-icon">
            <LockKeyhole size={17} />
            <input
              id="password"
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your demo password"
            />
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-green" disabled={busy}>
            {busy ? (
              <Spinner />
            ) : (
              <>
                Open hiring pipeline <ArrowRight size={17} />
              </>
            )}
          </button>
          <p className="fineprint">
            Private employer workspace · Certiio simulation demo
          </p>
        </form>
        <span className="login-bottom">
          Better hiring, for the agentic era.
        </span>
      </div>
      <div className="login-art">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="login-preview">
          <span className="eyebrow">AI FORWARD DEPLOYED ENGINEER</span>
          <h2>
            From understanding
            <br />
            to impact.
          </h2>
          <div className="preview-stages">
            {[
              [AudioLines, "01", "Discover the real need"],
              [Network, "02", "Design with intention"],
              [PackageCheck, "03", "Deliver the outcome"],
            ].map(([Icon, n, title]) => {
              const I = Icon as typeof AudioLines;
              return (
                <div key={n as string}>
                  <span className="preview-node">
                    <I size={23} />
                  </span>
                  <span>
                    <small>{n as string} / WORK SIMULATION</small>
                    <strong>{title as string}</strong>
                  </span>
                  <ArrowRight size={19} />
                </div>
              );
            })}
          </div>
          <div className="preview-bottom">
            <span className="green-dot" />
            Evidence across the entire workflow
          </div>
        </div>
        <span className="art-caption">
          Good interviews ask what you would do.
          <br />
          Great simulations show what you actually do.
        </span>
      </div>
    </main>
  );
}
