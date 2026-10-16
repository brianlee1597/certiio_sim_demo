"use client";

import { useEffect, useRef, useState } from "react";
import { Drawer, Modal } from "@mantine/core";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  AudioLines,
  Blocks,
  Check,
  CheckCircle2,
  Clock3,
  Code2,
  FilePenLine,
  FileText,
  GripVertical,
  Inbox,
  Link2,
  LockKeyhole,
  Network,
  PackageCheck,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import {
  durationLabel,
  emptyWorkflow,
  moduleFor,
  moduleTeams,
  restoreWorkflow,
  workflowModules,
  type WorkflowDraft,
  type WorkflowModule,
  type WorkflowStep,
} from "@/lib/workflow-modules";

const STORAGE_KEY = "certiio-workflow-builder-v1";
const teamClass = (team: string) =>
  `module-team-${team.toLowerCase().replaceAll(" ", "-")}`;
function ModuleIcon({
  module,
  size = 19,
}: {
  module: WorkflowModule;
  size?: number;
}) {
  const Icon =
    module.format === "AI roleplay"
      ? AudioLines
      : module.format === "Whiteboard"
        ? Network
        : module.format === "Spreadsheet" || module.format === "CRM simulation"
          ? Table2
          : module.format === "Inbox simulation"
            ? Inbox
            : module.format === "Take-home project"
              ? PackageCheck
              : module.format === "Code exercise" ||
                  module.format === "Evaluation lab"
                ? Code2
                : module.format === "Document markup" ||
                    module.format === "Writing exercise"
                  ? FilePenLine
                  : module.format === "Research brief"
                    ? Search
                    : FileText;
  return <Icon size={size} />;
}

export function WorkflowBuilder() {
  const [draft, setDraft] = useState<WorkflowDraft>(emptyWorkflow);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [team, setTeam] = useState("All teams");
  const [search, setSearch] = useState("");
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [undo, setUndo] = useState<WorkflowDraft | null>(null);
  const [notice, setNotice] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const dragSource = useRef<string | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setDraft(restoreWorkflow(stored));
    } catch {
      setNotice(
        "Your previous draft could not be opened. Start a new workflow below.",
      );
    }
    setReady(true);
  }, []);
  function saveDraft(value: WorkflowDraft) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }
  useEffect(() => {
    if (ready) saveDraft(draft);
  }, [draft, ready]);

  function update(next: WorkflowDraft, message: string) {
    setUndo(draft);
    setDraft(next);
    setNotice(message);
    setInsertAt(null);
  }
  function add(module: WorkflowModule) {
    if (draft.steps.length >= 30) {
      setNotice(
        "This demo supports up to 30 steps. Remove a step to add another.",
      );
      return;
    }
    const next = [...draft.steps];
    const step: WorkflowStep = {
      id: crypto.randomUUID(),
      moduleId: module.id,
      title: module.title,
      minutes: module.minutes,
      timing: module.format === "Take-home project" ? "suggested" : "timed",
      brief: module.brief,
      carryContext: true,
    };
    next.splice(insertAt ?? next.length, 0, step);
    update(
      { ...draft, steps: next },
      `${module.title} added to your workflow.`,
    );
  }
  function move(id: string, index: number) {
    const from = draft.steps.findIndex((step) => step.id === id);
    if (from < 0 || from === index || index < 0 || index >= draft.steps.length)
      return;
    const steps = [...draft.steps];
    const [step] = steps.splice(from, 1);
    steps.splice(index, 0, step);
    update({ ...draft, steps }, `${step.title} moved to step ${index + 1}.`);
  }
  function dragTargetAt(x: number, y: number) {
    return document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>("[data-step-id]")?.dataset.stepId;
  }
  function finishDrag(x: number, y: number) {
    const target = dragTargetAt(x, y);
    if (dragSource.current && target)
      move(
        dragSource.current,
        draft.steps.findIndex((s) => s.id === target),
      );
    dragSource.current = null;
    setDragging(null);
    setDropTarget(null);
  }
  function choosePosition(index: number) {
    setInsertAt(index);
    searchInput.current?.focus();
  }
  const modules = workflowModules.filter(
    (module) =>
      (team === "All teams" || module.team === team) &&
      `${module.title} ${module.description} ${module.team} ${module.format} ${module.signals.join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase().trim()),
  );
  const selected = draft.steps.find((step) => step.id === editing);
  const total = draft.steps.reduce((sum, step) => sum + step.minutes, 0);

  return (
    <section className="workflow-builder" aria-label="Workflow builder">
      <div className="builder-intro">
        <div>
          <span className="eyebrow">
            A DIFFERENT ROLE. A DIFFERENT KIND OF WORK.
          </span>
          <p>
            Choose the moments that reveal how someone works. Connect them into
            one experience.
          </p>
        </div>
        <span className="builder-demo-badge">
          <Sparkles size={14} />
          Interactive demo
        </span>
      </div>
      <div className="builder-layout">
        <aside className="module-library" aria-label="Module library">
          <div className="library-header">
            <div className="library-title">
              <span className="builder-icon">
                <Blocks size={18} />
              </span>
              <h2>Module library</h2>
              <span>{workflowModules.length}</span>
            </div>
            <p>Small simulations. Meaningful signals.</p>
            <div className="input-icon">
              <Search size={15} />
              <input
                ref={searchInput}
                aria-label="Search modules"
                placeholder="Search modules…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <label className="sr-only" htmlFor="module-team">
              Filter modules by team
            </label>
            <select
              id="module-team"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
            >
              <option>All teams</option>
              {moduleTeams.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </div>
          {insertAt !== null && (
            <div className="library-insert" role="status">
              Adding at step {insertAt + 1}
              <button
                aria-label="Cancel insertion"
                onClick={() => setInsertAt(null)}
              >
                <X size={14} />
              </button>
            </div>
          )}
          <div className="library-count">
            {modules.length} example module{modules.length === 1 ? "" : "s"}
            <span>Click to add</span>
          </div>
          <div className="library-scroll">
            {modules.map((module) => (
              <button
                className={`module-option ${teamClass(module.team)}`}
                key={module.id}
                aria-label={`Add ${module.title}`}
                disabled={!ready || draft.steps.length >= 30}
                onClick={() => add(module)}
              >
                <div className="module-option-top">
                  <span className="module-icon">
                    <ModuleIcon module={module} size={17} />
                  </span>
                  <span className="module-team-label">{module.team}</span>
                  <Plus className="module-add-icon" size={16} />
                </div>
                <strong>{module.title}</strong>
                <p>{module.description}</p>
                <div className="module-option-meta">
                  <span>{module.format}</span>
                  <span>{durationLabel(module.minutes)}</span>
                </div>
              </button>
            ))}
            {!modules.length && (
              <div className="library-empty">
                <Search size={23} />
                <h3>No modules found</h3>
                <p>Try another search or team.</p>
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    setSearch("");
                    setTeam("All teams");
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
          <div className="library-footer">
            <ShieldCheck size={14} />
            Fictional tasks for exploring the builder
          </div>
        </aside>

        <div className="workflow-editor">
          <div className="workflow-toolbar">
            <div className="workflow-name">
              <label htmlFor="workflow-name">YOUR WORKFLOW</label>
              <input
                id="workflow-name"
                value={draft.name}
                maxLength={100}
                disabled={!ready}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Name your workflow"
              />
              <div className="workflow-stats">
                <span>
                  {draft.steps.length} step{draft.steps.length === 1 ? "" : "s"}
                </span>
                <span>·</span>
                <span>
                  <Clock3 size={12} />
                  {total
                    ? `${durationLabel(total)} total effort`
                    : "No time added yet"}
                </span>
              </div>
            </div>
            <div className="workflow-toolbar-actions">
              <button
                className="builder-icon-button"
                aria-label="Clear workflow"
                title="Clear workflow"
                disabled={!draft.steps.length}
                onClick={() =>
                  update(
                    emptyWorkflow(),
                    "Workflow cleared. You can undo this change.",
                  )
                }
              >
                <RotateCcw size={16} />
              </button>
              <button
                className="btn btn-dark"
                disabled={!draft.steps.length}
                onClick={() => setPreview(true)}
              >
                <Play size={14} />
                Preview
              </button>
            </div>
          </div>
          <div className="workflow-feedback">
            <span className={saveError ? "error" : ""}>
              {!ready ? (
                "Opening draft…"
              ) : saveError ? (
                "Draft could not be saved"
              ) : (
                <>
                  <Check size={13} />
                  Saved on this device
                </>
              )}
            </span>
            {saveError && (
              <button onClick={() => saveDraft(draft)}>Retry save</button>
            )}
            {undo && (
              <button
                onClick={() => {
                  setDraft(undo);
                  setUndo(null);
                  setInsertAt(null);
                  setNotice("Last change undone.");
                }}
              >
                <RotateCcw size={12} />
                Undo
              </button>
            )}
          </div>
          <div className="workflow-canvas" aria-label="Workflow canvas">
            <div className="workflow-terminal">
              <span className="terminal-dot" />
              <div>
                <strong>Candidate invited</strong>
                <small>The journey starts with a clear brief.</small>
              </div>
            </div>
            {!draft.steps.length ? (
              <div className="workflow-blank">
                <div className="blank-connector" />
                <div className="blank-module-symbol">
                  <Blocks size={32} />
                  <span>
                    <Plus size={15} />
                  </span>
                </div>
                <span className="eyebrow">YOUR WORKFLOW STARTS HERE</span>
                <h2>Start with the work.</h2>
                <p>
                  Add a module from the library. Mix disciplines, set the
                  challenge, and decide what carries forward.
                </p>
                <button
                  className="btn btn-outline"
                  disabled={!ready}
                  onClick={() => {
                    setTeam("All teams");
                    setSearch("");
                    searchInput.current?.focus();
                  }}
                >
                  <Plus size={15} />
                  Explore {workflowModules.length} modules
                </button>
                <div className="blank-teams">
                  <span>Operations</span>
                  <span>Sales</span>
                  <span>Legal</span>
                  <span>+4 teams</span>
                </div>
              </div>
            ) : (
              <ol className="workflow-steps">
                {draft.steps.map((step, index) => {
                  const module = moduleFor(step.moduleId);
                  return (
                    <li
                      key={step.id}
                      data-step-id={step.id}
                      className={`workflow-step ${teamClass(module.team)}${dragging === step.id ? " dragging" : ""}${dropTarget === step.id && dragging !== step.id ? " drop-target" : ""}`}
                    >
                      <div className="workflow-insert">
                        <button
                          aria-label={`Insert module before step ${index + 1}`}
                          className={insertAt === index ? "selected" : ""}
                          onClick={() => choosePosition(index)}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <div className="workflow-step-row">
                        <span className="workflow-step-number">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <article className="workflow-step-card">
                          <div className="workflow-step-top">
                            <span className="module-icon">
                              <ModuleIcon module={module} />
                            </span>
                            <div>
                              <span className="module-team-label">
                                {module.team}
                              </span>
                              <span className="workflow-step-format">
                                {module.format}
                              </span>
                            </div>
                            <button
                              className="builder-icon-button drag-handle"
                              onPointerDown={(e) => {
                                if (e.button !== 0) return;
                                e.currentTarget.setPointerCapture(e.pointerId);
                                dragSource.current = step.id;
                                setDragging(step.id);
                              }}
                              onPointerMove={(e) => {
                                if (dragSource.current)
                                  setDropTarget(
                                    dragTargetAt(e.clientX, e.clientY) || null,
                                  );
                              }}
                              onPointerUp={(e) =>
                                finishDrag(e.clientX, e.clientY)
                              }
                              onPointerCancel={() => {
                                dragSource.current = null;
                                setDragging(null);
                                setDropTarget(null);
                              }}
                              aria-label={`Drag ${step.title} to reorder`}
                              title="Drag to reorder; use arrows below with a keyboard"
                            >
                              <GripVertical size={17} />
                            </button>
                          </div>
                          <button
                            className="workflow-step-title"
                            onClick={() => setEditing(step.id)}
                          >
                            {step.title}
                            <Settings2 size={14} />
                          </button>
                          <p className="workflow-step-description">
                            {step.brief}
                          </p>
                          <div className="workflow-step-output">
                            <FileText size={13} />
                            {module.output}
                          </div>
                          <div className="workflow-step-bottom">
                            <span>
                              <Clock3 size={13} />
                              {durationLabel(step.minutes)} ·{" "}
                              {step.timing === "timed" ? "Timed" : "Suggested"}
                            </span>
                            <div>
                              <button
                                className="builder-icon-button"
                                aria-label={`Move ${step.title} up`}
                                disabled={index === 0}
                                onClick={() => move(step.id, index - 1)}
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button
                                className="builder-icon-button"
                                aria-label={`Move ${step.title} down`}
                                disabled={index === draft.steps.length - 1}
                                onClick={() => move(step.id, index + 1)}
                              >
                                <ArrowDown size={14} />
                              </button>
                              <button
                                className="builder-icon-button"
                                aria-label={`Configure ${step.title}`}
                                onClick={() => setEditing(step.id)}
                              >
                                <Settings2 size={14} />
                              </button>
                              <button
                                className="builder-icon-button remove-step"
                                aria-label={`Remove ${step.title}`}
                                onClick={() =>
                                  update(
                                    {
                                      ...draft,
                                      steps: draft.steps.filter(
                                        (s) => s.id !== step.id,
                                      ),
                                    },
                                    `${step.title} removed.`,
                                  )
                                }
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </article>
                      </div>
                      {index > 0 && (
                        <div className="workflow-context-label">
                          <Link2 size={12} />
                          {step.carryContext
                            ? "Receives earlier work as context"
                            : "Starts with its own brief"}
                        </div>
                      )}
                    </li>
                  );
                })}
                <li className="workflow-add-row">
                  <button
                    className="btn btn-outline"
                    disabled={draft.steps.length >= 30}
                    onClick={() => choosePosition(draft.steps.length)}
                  >
                    <Plus size={15} />
                    Add a module
                  </button>
                </li>
              </ol>
            )}
            <div className="workflow-terminal workflow-terminal-end">
              <CheckCircle2 size={19} />
              <div>
                <strong>One complete picture</strong>
                <small>Connected evidence, ready for review.</small>
              </div>
            </div>
          </div>
          <div className="workflow-bottom-note">
            <Link2 size={14} />
            <span>
              Steps unlock in sequence. Choose how earlier work informs each
              next step.
            </span>
          </div>
        </div>
      </div>
      <div className="builder-footer">
        <span>
          Preview only · Example modules do not change the live AI FDE exercise.
        </span>
        <span role="status" aria-live="polite">
          {notice}
        </span>
      </div>
      <Drawer
        opened={!!selected}
        onClose={() => setEditing(null)}
        title="Configure module"
        position="right"
        size="md"
        closeButtonProps={{ "aria-label": "Close module settings" }}
      >
        {selected && (
          <ModuleSettings
            key={selected.id}
            step={selected}
            onCancel={() => setEditing(null)}
            onSave={(step) => {
              update(
                {
                  ...draft,
                  steps: draft.steps.map((s) => (s.id === step.id ? step : s)),
                },
                `${step.title} updated.`,
              );
              setEditing(null);
            }}
          />
        )}
      </Drawer>
      <Modal
        opened={preview}
        onClose={() => setPreview(false)}
        title="Candidate experience preview"
        size="xl"
        centered
        closeButtonProps={{ "aria-label": "Close preview" }}
      >
        {preview && <WorkflowPreview draft={draft} />}
      </Modal>
    </section>
  );
}

function ModuleSettings({
  step,
  onSave,
  onCancel,
}: {
  step: WorkflowStep;
  onSave: (value: WorkflowStep) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(step);
  const module = moduleFor(step.moduleId);
  return (
    <form
      className={`module-settings ${teamClass(module.team)}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (value.title.trim() && value.brief.trim())
          onSave({
            ...value,
            title: value.title.trim(),
            brief: value.brief.trim(),
          });
      }}
    >
      <div className="settings-module-heading">
        <span className="module-icon">
          <ModuleIcon module={module} size={23} />
        </span>
        <div>
          <span className="module-team-label">{module.team}</span>
          <h2>{module.title}</h2>
          <p>{module.format} · Example module</p>
        </div>
      </div>
      <label htmlFor="step-title">Step title</label>
      <input
        id="step-title"
        required
        maxLength={100}
        value={value.title}
        onChange={(e) => setValue({ ...value, title: e.target.value })}
      />
      <div className="settings-two-columns">
        <div>
          <label htmlFor="step-minutes">Minutes</label>
          <input
            id="step-minutes"
            type="number"
            min={1}
            max={240}
            required
            value={value.minutes || ""}
            onChange={(e) =>
              setValue({ ...value, minutes: Number(e.target.value) })
            }
          />
        </div>
        <div>
          <label htmlFor="step-timing">Time allowance</label>
          <select
            id="step-timing"
            value={value.timing}
            onChange={(e) =>
              setValue({
                ...value,
                timing: e.target.value as WorkflowStep["timing"],
              })
            }
          >
            <option value="timed">Timed session</option>
            <option value="suggested">Suggested effort</option>
          </select>
        </div>
      </div>
      <label htmlFor="step-brief">Candidate brief</label>
      <textarea
        id="step-brief"
        rows={6}
        required
        maxLength={4000}
        value={value.brief}
        onChange={(e) => setValue({ ...value, brief: e.target.value })}
      />
      <label className="context-toggle">
        <input
          type="checkbox"
          checked={value.carryContext}
          onChange={(e) =>
            setValue({ ...value, carryContext: e.target.checked })
          }
        />
        <span>
          <strong>Carry forward earlier work</strong>
          <small>
            Give the candidate context from preceding modules. The first step
            starts with its own brief.
          </small>
        </span>
      </label>
      <div className="settings-evidence">
        <span className="eyebrow">EVIDENCE THIS MODULE WOULD CAPTURE</span>
        <p>
          <FileText size={16} />
          {module.output}
        </p>
        <div className="signal-tags">
          {module.signals.map((signal) => (
            <span key={signal}>{signal}</span>
          ))}
        </div>
      </div>
      <div className="settings-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-dark" type="submit">
          Save module <Check size={15} />
        </button>
      </div>
    </form>
  );
}

function WorkflowPreview({ draft }: { draft: WorkflowDraft }) {
  const [current, setCurrent] = useState(0);
  const step = draft.steps[current];
  const complete = current >= draft.steps.length;
  return (
    <div className="workflow-preview">
      <span className="builder-demo-badge">
        <Play size={12} />
        Preview mode · no work is submitted
      </span>
      <h2>{draft.name.trim() || "Untitled workflow"}</h2>
      <p className="muted">
        {draft.steps.length} connected steps ·{" "}
        {durationLabel(draft.steps.reduce((sum, s) => sum + s.minutes, 0))}{" "}
        total effort
      </p>
      <ol className="preview-workflow-list">
        {draft.steps.map((s, index) => (
          <li
            key={s.id}
            className={
              index < current
                ? "complete"
                : index === current
                  ? "current"
                  : "locked"
            }
          >
            <span className="preview-step-number">
              {index < current ? <Check size={15} /> : index + 1}
            </span>
            <div>
              <strong>{s.title}</strong>
              <small>
                {moduleFor(s.moduleId).format} · {durationLabel(s.minutes)}
              </small>
            </div>
            <span className="preview-step-status">
              {index < current ? (
                "Submitted"
              ) : index === current ? (
                "Ready"
              ) : (
                <>
                  <LockKeyhole size={11} />
                  Locked
                </>
              )}
            </span>
          </li>
        ))}
      </ol>
      {complete ? (
        <div className="preview-complete">
          <CheckCircle2 size={32} />
          <h3>Workflow complete.</h3>
          <p>Each step contributes evidence to the final review.</p>
          <button className="btn btn-outline" onClick={() => setCurrent(0)}>
            <RotateCcw size={14} />
            Restart preview
          </button>
        </div>
      ) : (
        <div className="preview-current-module">
          <span className="eyebrow">
            STEP {String(current + 1).padStart(2, "0")} /{" "}
            {moduleFor(step.moduleId).team.toUpperCase()}
          </span>
          <h3>{step.title}</h3>
          <p>{step.brief}</p>
          {current > 0 && step.carryContext && (
            <div className="preview-context">
              <span>
                <Link2 size={14} />
                <strong>Context from earlier work</strong>
              </span>
              <p>
                In a configured workflow, these outputs would be available here:
              </p>
              <ul>
                {draft.steps.slice(0, current).map((s) => (
                  <li key={s.id}>
                    {s.title}: {moduleFor(s.moduleId).output}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="preview-output">
            <FileText size={14} />
            Expected output: {moduleFor(step.moduleId).output}
          </div>
          <button
            className="btn btn-dark"
            onClick={() => setCurrent(current + 1)}
          >
            Complete step in preview <ArrowRight size={14} />
          </button>
          <p className="fineprint">
            This previews the sequence. Module tools and timers do not run here.
          </p>
        </div>
      )}
    </div>
  );
}
