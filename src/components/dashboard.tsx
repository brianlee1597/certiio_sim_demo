"use client";
import { useEffect, useMemo, useState } from "react";
import { Modal, Drawer } from "@mantine/core";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  FileText,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Mail,
  Network,
  PackageCheck,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  STAGES,
  rubric,
  stageInfo,
  type Stage,
  type Invitation,
  type Run,
} from "@/lib/domain";
import { candidates, type Candidate } from "@/lib/candidates";
import { api, Brand, Empty, Footer, Pill, Spinner } from "./shared";
const stageIcons = {
  roleplay: AudioLines,
  design: Network,
  delivery: PackageCheck,
};
type Invite = Invitation & { link: string; runs: Run[] };
export function Dashboard({ initialTab }: { initialTab: string }) {
  const [tab, setTab] = useState(
    ["pipeline", "invites", "results"].includes(initialTab)
      ? initialTab
      : "pipeline",
  );
  const [brief, setBrief] = useState<Stage | null>(null),
    [invites, setInvites] = useState<Invite[]>([]),
    [config, setConfig] = useState<Record<string, boolean>>({}),
    [loadError, setLoadError] = useState("");
  async function refresh() {
    try {
      const data = await api("/api/admin/invitations");
      setInvites(data.invitations);
      setLoadError("");
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }
  useEffect(() => {
    refresh();
    api("/api/admin/config")
      .then(setConfig)
      .catch(() => {});
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, []);
  function changeTab(t: string) {
    setTab(t);
    history.replaceState(null, "", `/?tab=${t}`);
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="sidebar-brand" href="/">
          <Brand light />
        </a>
        <div className="workspace-switch">
          <span className="workspace-avatar">C</span>
          <div>
            <strong>Certiio workspace</strong>
            <small>Work simulation demo</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <div className="sidebar-label">HIRING WORKSPACE</div>
        <button
          className="side-nav selected"
          onClick={() => changeTab("pipeline")}
        >
          <GitBranch size={18} />
          Hiring pipeline <span>1</span>
        </button>
        <button className="side-nav" onClick={() => changeTab("invites")}>
          <Mail size={18} />
          Invitations <span>{invites.length}</span>
        </button>
        <button className="side-nav" onClick={() => changeTab("results")}>
          <BarChart3 size={18} />
          Candidate results <span>100</span>
        </button>
        <div className="sidebar-note">
          <span className="small-icon">
            <Sparkles size={17} />
          </span>
          <strong>Signal over speculation.</strong>
          <p>See how candidates think, connect the dots, and ship.</p>
          <span className="note-line" />
        </div>
        <div className="sidebar-bottom">
          <span className="user-avatar">BL</span>
          <div>
            <strong>Demo administrator</strong>
            <small>Employer workspace</small>
          </div>
          <button
            aria-label="Sign out"
            onClick={async () => {
              await api("/api/logout", {});
              location.reload();
            }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>
            <LayoutDashboard size={15} />
            <span>Hiring pipelines</span>
            <ChevronRight size={14} />
            <strong>AI FDE</strong>
          </span>
          <Pill tone="neutral">
            <span className="green-dot" />
            Demo workspace
          </Pill>
        </header>
        <main className="dashboard-main">
          <div className="role-heading">
            <div>
              <div className="eyebrow">
                <span className="green-dot" />
                ENGINEERING · CUSTOMER-FACING
              </div>
              <h1>AI Forward Deployed Engineer</h1>
              <p>
                Find the people who can turn a customer problem into a working
                solution.
              </p>
            </div>
            <button
              className="btn btn-dark"
              onClick={() => changeTab("invites")}
            >
              <Plus size={17} />
              Invite candidate
            </button>
          </div>
          <div className="role-meta">
            <span>
              <GitBranch size={15} />
              Custom hiring pipeline
            </span>
            <span>
              <Clock3 size={15} />
              ~2h 45m total
            </span>
            <span>
              <Users size={15} />
              100 sample applicants
            </span>
            <Pill tone="green">
              <Check size={12} />
              Finalized
            </Pill>
          </div>
          <nav className="tabs" aria-label="Hiring pipeline tabs">
            {[
              ["pipeline", "Pipeline", GitBranch],
              ["invites", "Invites", Mail],
              ["results", "Results", BarChart3],
            ].map(([id, label, Icon]) => {
              const I = Icon as typeof Mail;
              return (
                <button
                  className={tab === id ? "active" : ""}
                  key={id as string}
                  onClick={() => changeTab(id as string)}
                >
                  <I size={17} />
                  {label as string}
                  {id === "results" && <span className="tab-count">100</span>}
                </button>
              );
            })}
          </nav>
          {loadError && (
            <div className="alert error">
              {loadError}
              <button onClick={refresh}>Retry</button>
            </div>
          )}
          {tab === "pipeline" ? (
            <Pipeline onBrief={setBrief} />
          ) : tab === "invites" ? (
            <Invites invites={invites} refresh={refresh} config={config} />
          ) : (
            <Results invites={invites} />
          )}
          <Footer />
        </main>
      </div>
      <Modal
        opened={!!brief}
        onClose={() => setBrief(null)}
        title={brief ? stageInfo[brief].title : ""}
        size="lg"
        centered
      >
        {brief && <StageBrief stage={brief} />}
      </Modal>
    </div>
  );
}
function Pipeline({ onBrief }: { onBrief: (s: Stage) => void }) {
  return (
    <div className="pipeline-layout">
      <section>
        <div className="section-heading">
          <div>
            <span className="eyebrow">YOUR ASSESSMENT WORKFLOW</span>
            <h2>Work simulation</h2>
          </div>
          <Pill tone="green">
            <ShieldCheck size={13} />
            Ready to invite
          </Pill>
        </div>
        <p className="section-description">
          Three connected stages. Each one builds on the work before it.
        </p>
        <div className="vertical-pipeline">
          {STAGES.map((s, i) => {
            const info = stageInfo[s],
              Icon = stageIcons[s];
            return (
              <div className="pipeline-step" key={s}>
                <div className="pipeline-rail">
                  <span className="number-node">{info.number}</span>
                  {i < 2 && (
                    <span className="rail-line">
                      <ArrowDown size={15} />
                    </span>
                  )}
                </div>
                <article className="stage-card">
                  <div className="stage-card-top">
                    <span className={`stage-icon stage-icon-${s}`}>
                      <Icon size={21} />
                    </span>
                    <span className="stage-format">{info.format}</span>
                    <span className="stage-time">
                      <Clock3 size={13} />
                      {info.time}
                    </span>
                  </div>
                  <h3>{info.title}</h3>
                  <p>{info.description}</p>
                  <div className="signal-tags">
                    {info.signals.map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                  <div className="stage-card-bottom">
                    <span>
                      <FileText size={14} />
                      {info.deliverable}
                    </span>
                    <button onClick={() => onBrief(s)}>
                      View brief <ArrowUpRight size={15} />
                    </button>
                  </div>
                </article>
                {i < 2 && (
                  <div className="handoff-label">
                    {i === 0
                      ? "Conversation context carries forward"
                      : "Architecture & decisions carry forward"}
                    <ChevronDown size={12} />
                  </div>
                )}
              </div>
            );
          })}
          <div className="pipeline-finish">
            <span>
              <Check size={16} />
            </span>
            <div>
              <strong>One complete picture</strong>
              <small>Evidence from discovery through delivery</small>
            </div>
          </div>
        </div>
      </section>
      <aside className="pipeline-aside">
        <div className="scenario-card">
          <span className="eyebrow">THE CONNECTING CHALLENGE</span>
          <div className="northstar-mark">✳</div>
          <h2>
            Northstar
            <br />
            Support
          </h2>
          <p>
            A support team ready for AI.
            <br />A pilot that has to earn its place.
          </p>
          <div className="scenario-divider" />
          <span className="scenario-label">THE MISSION</span>
          <p>
            Discover, design, and deliver a grounded AI resolution agent for a
            growing B2B software company.
          </p>
          <div className="scenario-pills">
            <span>Real customer constraints</span>
            <span>Human approval</span>
            <span>Measurable outcomes</span>
          </div>
        </div>
        <div className="rubric-card">
          <div className="card-title">
            <Activity size={17} />
            <h3>What great looks like</h3>
          </div>
          <p>One consistent rubric, set before candidates start.</p>
          {rubric.map((r, i) => (
            <div className="rubric-row" key={r.name}>
              <span>
                <i className={`rubric-dot dot-${i}`} />
                {r.name}
              </span>
              <strong>{r.weight}%</strong>
              <div className="weight-track">
                <span style={{ width: `${r.weight * 3}%` }} />
              </div>
            </div>
          ))}
          <div className="rubric-foot">
            <GitBranch size={17} />
            <span>
              25% of the score measures how well the work connects across
              stages.
            </span>
          </div>
        </div>
        <div className="quiet-note">
          <ShieldCheck size={17} />
          <p>
            Evidence supports the decision.
            <br />
            <strong>Your team makes the call.</strong>
          </p>
        </div>
      </aside>
    </div>
  );
}
export function StageBrief({ stage }: { stage: Stage }) {
  return (
    <div className="brief-content">
      <Pill>
        {stageInfo[stage].time} · {stageInfo[stage].format}
      </Pill>
      <h3>
        {stage === "roleplay"
          ? "A customer conversation, not a pitch."
          : stage === "design"
            ? "Design for the customer you just met."
            : "Make the solution real."}
      </h3>
      <p>{stageInfo[stage].description}</p>
      {stage === "roleplay" ? (
        <>
          <h4>Your customer</h4>
          <p>
            Meet Maya Torres, Head of Support at Northstar, a B2B software
            company. Her team is spending too much time on repetitive tickets.
            Leadership wants an AI pilot, but a previous chatbot lost the team’s
            trust.
          </p>
          <h4>Your job</h4>
          <ul>
            <li>
              Understand the support workflow and what is causing the workload.
            </li>
            <li>
              Ask about users, data, constraints, approval responsibilities, and
              prior failures.
            </li>
            <li>Agree on success measures and a realistic first slice.</li>
            <li>
              Close with your understanding of the problem and next steps.
            </li>
          </ul>
          <p className="subtle-box">
            Your camera and microphone are enabled for the conversation. A
            transcript carries forward to your design stage. Camera footage is
            not used for grading.
          </p>
        </>
      ) : stage === "design" ? (
        <>
          <h4>Show the full path</h4>
          <ul>
            <li>
              Knowledge ingestion, freshness, retrieval, and source grounding.
            </li>
            <li>Tenant-aware access to account data and tools.</li>
            <li>
              Permission boundaries, human approvals, and failure handling.
            </li>
            <li>
              Evaluation, observability, cost, and a staged pilot rollout.
            </li>
          </ul>
          <p>
            Use the whiteboard to communicate the system. Add short decision
            notes explaining your tradeoffs and assumptions. Your transcript
            remains available from the context button.
          </p>
        </>
      ) : (
        <>
          <h4>Deliver a working slice</h4>
          <ul>
            <li>
              Implement one complete support-resolution workflow using the
              starter’s synthetic data and mock tools.
            </li>
            <li>
              Demonstrate grounding, tenant isolation, approvals, and honest
              failure handling.
            </li>
            <li>Run evaluations and report both passes and failures.</li>
            <li>
              Explain setup, scope, limitations, and any changes from your
              design.
            </li>
          </ul>
          <p>
            Submit a project ZIP (maximum 50 MB) with implementation,
            evaluation, and handoff notes. Two hours is a suggested effort, not
            an enforced countdown. AI tools are welcome; explain how you
            validated their output.
          </p>
        </>
      )}
      <h4>Signals we look for</h4>
      <div className="signal-tags">
        {stageInfo[stage].signals.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>
    </div>
  );
}
function Invites({
  invites,
  refresh,
  config,
}: {
  invites: Invite[];
  refresh: () => Promise<void>;
  config: Record<string, boolean>;
}) {
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [copied, setCopied] = useState("");
  return (
    <section className="invites-view">
      <div className="section-heading">
        <div>
          <span className="eyebrow">LET THE WORK BEGIN</span>
          <h2>Invite your next builder.</h2>
        </div>
        <Pill>
          {invites.length} real demo invitation{invites.length === 1 ? "" : "s"}
        </Pill>
      </div>
      <div className="invite-grid">
        <form
          className="invite-form card"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            setNotice("");
            try {
              await api("/api/admin/invitations", { name, email });
              setNotice(`Invitation sent to ${email}.`);
              setName("");
              setEmail("");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
              await refresh();
            }
          }}
        >
          <div className="card-title">
            <Send size={19} />
            <h3>A private invitation. A clear next step.</h3>
          </div>
          <p>
            Send yourself an invitation to experience the complete candidate
            journey.
          </p>
          <div className="form-row">
            <div>
              <label htmlFor="invite-name">Candidate name</label>
              <input
                id="invite-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Morgan"
                required
                maxLength={100}
              />
            </div>
            <div>
              <label htmlFor="invite-email">Email address</label>
              <input
                id="invite-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                type="email"
                required
              />
            </div>
          </div>
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="alert success" role="status">
              <Check size={16} />
              {notice}
            </div>
          )}
          <div className="form-bottom">
            <span>
              <LockBadge />
              Private link · expires in 7 days
            </span>
            <button className="btn btn-dark" disabled={busy}>
              {busy ? <Spinner /> : <Send size={16} />}Send invitation
            </button>
          </div>
        </form>
        <div className="invite-preview">
          <span className="eyebrow">IN THEIR INBOX</span>
          <div className="email-mini">
            <Brand />
            <h3>Show how you work.</h3>
            <p>Your AI FDE work simulation is ready.</p>
            {STAGES.map((s) => (
              <div key={s}>
                <span>{stageInfo[s].number}</span>
                {stageInfo[s].title}
              </div>
            ))}
            <span className="email-cta">
              Open your exercise <ArrowRight size={14} />
            </span>
          </div>
        </div>
      </div>
      {config.livekit === false && (
        <div className="setup-banner">
          <AudioLines size={20} />
          <div>
            <strong>One connection left to make</strong>
            <p>
              Invitations and the exercise overview are ready. Configure LiveKit
              to begin the live customer conversation.
            </p>
          </div>
          <Pill tone="amber">LiveKit setup needed</Pill>
        </div>
      )}
      <div className="section-heading list-heading">
        <h3>Sent invitations</h3>
        <span className="muted">
          Real submissions are kept separate from sample results.
        </span>
      </div>
      {!invites.length ? (
        <Empty title="Your first candidate starts here.">
          Send a private invitation above. Their progress will appear here as
          they work.
        </Empty>
      ) : (
        <div className="table-wrap">
          <table className="data-table invites-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Email status</th>
                <th>Simulation progress</th>
                <th>Invited</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {invites.map((i) => (
                <tr key={i.id}>
                  <td>
                    <strong>{i.name}</strong>
                    <small>{i.email}</small>
                  </td>
                  <td>
                    <Pill
                      tone={
                        i.email_status === "sent"
                          ? "green"
                          : i.email_status === "failed"
                            ? "amber"
                            : "neutral"
                      }
                    >
                      {i.email_status}
                    </Pill>
                    {i.email_error && (
                      <small className="error">{i.email_error}</small>
                    )}
                  </td>
                  <td>
                    <div className="mini-progress">
                      {STAGES.map((s) => (
                        <span
                          key={s}
                          title={`${stageInfo[s].title}: ${i.runs.find((r) => r.stage === s)?.status}`}
                          className={
                            i.runs.find((r) => r.stage === s)?.status ===
                            "submitted"
                              ? "done"
                              : i.runs.find((r) => r.stage === s)?.status ===
                                  "active"
                                ? "in-progress"
                                : ""
                          }
                        />
                      ))}
                    </div>
                    <small>
                      {i.runs.filter((r) => r.status === "submitted").length}/3
                      submitted
                    </small>
                  </td>
                  <td>
                    {new Date(i.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        title="Copy private invitation link"
                        aria-label={`Copy link for ${i.name}`}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(i.link);
                            setCopied(i.id);
                            setTimeout(() => setCopied(""), 2000);
                          } catch {
                            setError(
                              "Clipboard access is unavailable. Open the invitation from your email.",
                            );
                          }
                        }}
                      >
                        {copied === i.id ? (
                          <Check size={16} />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                      <button
                        title="Resend invitation"
                        aria-label={`Resend invitation to ${i.name}`}
                        onClick={async () => {
                          try {
                            await api(
                              `/api/admin/invitations/${i.id}/resend`,
                              {},
                            );
                            setNotice(`Invitation resent to ${i.email}.`);
                          } catch (e) {
                            setError((e as Error).message);
                          }
                          await refresh();
                        }}
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
function LockBadge() {
  return <ShieldCheck size={14} />;
}
function Results({ invites }: { invites: Invite[] }) {
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [selected, setSelected] = useState<Candidate | null>(null);
  const visible = useMemo(
    () =>
      candidates.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) &&
          (filter === "all" || c.recommendation === filter),
      ),
    [search, filter],
  );
  const strong = candidates.filter((c) => c.overall >= 85).length,
    avg = (candidates.reduce((s, c) => s + c.overall, 0) / 100).toFixed(1);
  return (
    <section className="results-view">
      <div className="section-heading">
        <div>
          <span className="eyebrow">THE WORK, CONNECTED</span>
          <h2>A clearer picture of who can deliver.</h2>
        </div>
        <Pill tone="amber">
          <Sparkles size={13} />
          Synthetic demo data
        </Pill>
      </div>
      <p className="section-description">
        100 fictional applicants. One consistent rubric. Evidence behind every
        score.
      </p>
      <div className="results-stats">
        <div>
          <span>Completed applicants</span>
          <strong>
            100<small>/100</small>
          </strong>
          <p>All three simulations submitted</p>
        </div>
        <div>
          <span>Strong overall signal</span>
          <strong>
            {strong}
            <i className="green-dot" />
          </strong>
          <p>85+ across the weighted rubric</p>
        </div>
        <div>
          <span>Average overall score</span>
          <strong>
            {avg}
            <small>/100</small>
          </strong>
          <p>Discovery → design → delivery</p>
        </div>
        <div className="cross-stage-stat">
          <GitBranch size={22} />
          <strong>Connect the dots.</strong>
          <p>
            Cross-stage execution contributes <b>25%</b> of every overall score.
          </p>
        </div>
      </div>
      <div className="results-toolbar">
        <div className="input-icon search-input">
          <Search size={17} />
          <input
            aria-label="Search applicants"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search applicants…"
          />
        </div>
        <select
          aria-label="Filter by signal"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All signals</option>
          {["Strong signal", "Worth a closer look", "Mixed evidence"].map(
            (x) => (
              <option key={x}>{x}</option>
            ),
          )}
        </select>
        <span>
          <ArrowDown size={14} />
          Ranked by overall score
        </span>
      </div>
      <div className="table-wrap">
        <table className="data-table results-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Applicant</th>
              <th>
                Discovery<small>20%</small>
              </th>
              <th>
                Design<small>25%</small>
              </th>
              <th>
                Delivery<small>30%</small>
              </th>
              <th>
                Connected<small>25%</small>
              </th>
              <th>Overall</th>
              <th>Strongest signal</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => (
              <tr key={c.id} onClick={() => setSelected(c)}>
                <td>
                  <span className={`rank ${c.rank <= 3 ? "top-rank" : ""}`}>
                    {String(c.rank).padStart(2, "0")}
                  </span>
                </td>
                <td>
                  <button
                    className="candidate-name"
                    onClick={() => setSelected(c)}
                  >
                    <span
                      className={`candidate-avatar avatar-${c.profileIndex}`}
                    >
                      {c.initials}
                    </span>
                    <span>
                      <strong>{c.name}</strong>
                      <small>{c.recommendation}</small>
                    </span>
                  </button>
                </td>
                {c.scores.map((s, i) => (
                  <td key={i}>
                    <span className={`score-number ${s >= 85 ? "high" : ""}`}>
                      {s}
                    </span>
                  </td>
                ))}
                <td>
                  <span
                    className={`overall-score ${c.overall >= 85 ? "high" : ""}`}
                  >
                    {c.overall.toFixed(1)}
                  </span>
                </td>
                <td>
                  <span className="signal-cell">
                    {c.signal}
                    <ChevronRight size={16} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <Empty title="No matching applicants">
            Try another name or signal filter.
          </Empty>
        )}
      </div>
      <div className="table-foot">
        <span>Showing {visible.length} of 100 sample applicants</span>
        <span>Scores support review, not automatic hiring decisions.</span>
      </div>
      {invites.length > 0 && (
        <div className="real-submissions card">
          <h3>Your demo submissions</h3>
          <p>
            These are real attempts. They are not assigned synthetic grades.
          </p>
          {invites.map((i) => (
            <div key={i.id}>
              <span>
                <strong>{i.name}</strong>
                <small>{i.email}</small>
              </span>
              <Pill
                tone={
                  i.runs.every((r) => r.status === "submitted")
                    ? "green"
                    : "neutral"
                }
              >
                {i.runs.every((r) => r.status === "submitted")
                  ? "Submitted · ungraded"
                  : `${i.runs.filter((r) => r.status === "submitted").length}/3 completed · ungraded`}
              </Pill>
            </div>
          ))}
        </div>
      )}
      <Drawer
        opened={!!selected}
        onClose={() => setSelected(null)}
        title="Candidate evidence"
        position="right"
        size={760}
      >
        {selected && <CandidateReport c={selected} />}
      </Drawer>
    </section>
  );
}
function CandidateReport({ c }: { c: Candidate }) {
  const [tab, setTab] = useState("overview");
  useEffect(() => setTab("overview"), [c.id]);
  return (
    <div className="candidate-report">
      <Pill tone="amber">Fictional applicant · synthetic evidence</Pill>
      <div className="report-header">
        <span className={`candidate-avatar large avatar-${c.profileIndex}`}>
          {c.initials}
        </span>
        <div>
          <span className="eyebrow">RANK #{c.rank} OF 100</span>
          <h2>{c.name}</h2>
          <p>{c.name && c.recommendation}</p>
        </div>
        <div className="report-score">
          {c.overall}
          <small>overall / 100</small>
        </div>
      </div>
      <div className="report-summary">
        <Sparkles size={18} />
        <p>{c.signal}.</p>
      </div>
      <div className="report-score-grid">
        {rubric.map((r, i) => (
          <div key={r.name}>
            <span>{r.name}</span>
            <strong>
              {c.scores[i]}
              <small>/100</small>
            </strong>
            <small>{r.weight}% weight</small>
          </div>
        ))}
      </div>
      <nav className="tabs report-tabs">
        {["overview", "evidence", "traceability"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={tab === t ? "active" : ""}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>
      {tab === "overview" ? (
        <>
          <h3>Why this score</h3>
          <p>{c.delivery}</p>
          <div className="insight positive">
            <Check size={18} />
            <div>
              <strong>Strongest signal</strong>
              <p>{c.signal}.</p>
            </div>
          </div>
          <div className="insight caution">
            <Activity size={18} />
            <div>
              <strong>Review more closely</strong>
              <p>{c.gap}</p>
            </div>
          </div>
          <h3>How the work connects</h3>
          <div className="evidence-chain">
            {c.chain.map((x, i) => (
              <div key={x}>
                <span>{i + 1}</span>
                <p>{x}</p>
              </div>
            ))}
          </div>
          <p className="fineprint">
            Overall = discovery × 20% + design × 25% + delivery × 30% +
            cross-stage execution × 25%. Changes from the original design earn
            credit when the evidence supports them.
          </p>
        </>
      ) : tab === "evidence" ? (
        <>
          <div className="evidence-section">
            <h3>
              <AudioLines size={18} />
              Customer Roleplay <Pill>{c.minutes} minutes</Pill>
            </h3>
            <span className="eyebrow">SYNTHETIC TRANSCRIPT · 04:32</span>
            <blockquote>“{c.quote}”</blockquote>
            <p>
              Customer: “We need something the team can trust. Keep the pilot
              small and make it clear when a person needs to step in.”
            </p>
          </div>
          <div className="evidence-section">
            <h3>
              <Network size={18} />
              Solution Design <Pill>{c.designMinutes} minutes</Pill>
            </h3>
            <ArchitecturePreview profile={c.profileIndex} />
            <p>{c.design}</p>
          </div>
          <div className="evidence-section">
            <h3>
              <PackageCheck size={18} />
              Solution Delivery
            </h3>
            <div className="evaluation-summary">
              <strong>{c.tests}/20</strong>
              <span>illustrative evaluation cases passed</span>
            </div>
            <p>{c.delivery}</p>
            <p className="fineprint">
              Illustrative evaluation evidence, generated for this fictional
              profile. These results were not produced by executing a candidate
              submission.
            </p>
          </div>
        </>
      ) : (
        <>
          <h3>From customer need to verified outcome</h3>
          <p>Follow one requirement through the entire workflow.</p>
          <div className="traceability">
            {[
              "Customer need",
              "Design decision",
              "Delivered behavior",
              "Verification",
            ].map((label, i) => (
              <div key={label}>
                <span className="eyebrow">
                  0{i + 1} / {label}
                </span>
                <p>{c.chain[i]}</p>
                <Pill
                  tone={
                    c.scores[3] >= 80 ? "green" : i > 1 ? "amber" : "neutral"
                  }
                >
                  {c.scores[3] >= 80
                    ? "Evidence aligned"
                    : i > 1
                      ? "Gap to review"
                      : "Evidence captured"}
                </Pill>
              </div>
            ))}
          </div>
          <div className="insight caution">
            <GitBranch size={18} />
            <div>
              <strong>Cross-stage execution: {c.scores[3]}/100</strong>
              <p>{c.gap}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
function ArchitecturePreview({ profile }: { profile: number }) {
  return (
    <div className="architecture-preview">
      <span className="eyebrow">SYNTHETIC DESIGN SNAPSHOT</span>
      <div className="diagram-flow">
        <div>
          Support ticket<small>tenant context</small>
        </div>
        <ArrowRight size={17} />
        <div>
          {profile === 3 ? "Agent planner" : "Retrieve & ground"}
          <small>
            {profile === 3 ? "multi-agent routing" : "scoped knowledge"}
          </small>
        </div>
        <ArrowRight size={17} />
        <div>
          Answer + sources<small>or abstain</small>
        </div>
      </div>
      <div className="diagram-branches">
        <span>
          Account tools
          <br />
          <small>read-only</small>
        </span>
        <span className={profile === 2 ? "diagram-warning" : ""}>
          Human approval
          <br />
          <small>{profile === 2 ? "not enforced" : "before any action"}</small>
        </span>
        <span>
          Evaluation loop
          <br />
          <small>measure & improve</small>
        </span>
      </div>
    </div>
  );
}
