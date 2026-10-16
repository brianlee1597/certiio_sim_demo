"use client";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { CheckCircle2, Download, FileArchive, Upload } from "lucide-react";
import type { Run } from "@/lib/domain";
import { api, Saved, Spinner } from "./shared";
import { uploadArtifact } from "./upload";
export type DeliveryHandle = { save: () => Promise<void> };
const Delivery = forwardRef<
  DeliveryHandle,
  { run: Run; onError: (s: string) => void }
>(function Delivery({ run, onError }, ref) {
  const latest = useRef(run),
    payload = useRef(run.payload),
    queue = useRef<Promise<void>>(Promise.resolve()),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    dirty = useRef(false),
    changes = useRef(0);
  const [fields, setFields] = useState<Record<string, unknown>>(run.payload),
    [status, setStatus] = useState("saved"),
    [uploading, setUploading] = useState(false),
    [progress, setProgress] = useState(0),
    [fileName, setFileName] = useState(
      run.payload.projectArtifactId ? "Previously uploaded project.zip" : "",
    );
  const key = `certiio-delivery-${run.invite_id}`;
  const save = () => {
    const next = queue.current
      .catch(() => {})
      .then(async () => {
        setStatus("saving");
        const version = changes.current;
        try {
          const result = await api<{ run: Run }>("/api/stages/delivery/save", {
            revision: latest.current.revision,
            payload: payload.current,
          });
          latest.current = result.run;
          dirty.current = changes.current !== version;
          if (dirty.current) {
            localStorage.setItem(
              key,
              JSON.stringify({
                revision: latest.current.revision,
                payload: payload.current,
              }),
            );
          } else localStorage.removeItem(key);
          setStatus(dirty.current ? "saving" : "saved");
        } catch (e) {
          setStatus("error");
          onError((e as Error).message);
          throw e;
        }
      });
    queue.current = next;
    return next;
  };
  useImperativeHandle(ref, () => ({
    save: async () => {
      if (uploading) throw new Error("Wait for your upload to finish.");
      if (timer.current) clearTimeout(timer.current);
      await save();
    },
  }));
  useEffect(() => {
    try {
      const backup = JSON.parse(localStorage.getItem(key) || "null");
      if (backup?.revision === run.revision) {
        payload.current = backup.payload;
        setFields(backup.payload);
        dirty.current = true;
        save().catch(() => {});
      }
    } catch {}
    const leave = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("beforeunload", leave);
    };
  }, []);
  function update(field: string, value: unknown) {
    changes.current++;
    payload.current = { ...payload.current, [field]: value };
    setFields(payload.current);
    dirty.current = true;
    setStatus("saving");
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          revision: latest.current.revision,
          payload: payload.current,
        }),
      );
    } catch {}
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save().catch(() => {}), 1000);
  }
  return (
    <div className="delivery-workspace">
      <div className="delivery-grid">
        <section className="delivery-brief">
          <span className="eyebrow">NORTHSTAR SUPPORT · IMPLEMENTATION</span>
          <h2>
            A working slice.
            <br />
            An honest handoff.
          </h2>
          <p>
            Bring the customer’s needs and your design into a runnable
            support-resolution workflow. Build locally, then submit your project
            here.
          </p>
          <a href="/northstar-starter.zip" className="btn btn-dark" download>
            <Download size={16} />
            Download starter project
          </a>
          <h4>Inside the starter</h4>
          <ul>
            <li>TypeScript interfaces and a runnable test harness</li>
            <li>Synthetic knowledge, tickets, and account data</li>
            <li>Two tenants and scoped mock account tools</li>
            <li>20 evaluation cases, including failure scenarios</li>
            <li>A deterministic model fixture; no paid key required</li>
          </ul>
          <h4>What to deliver</h4>
          <ul>
            <li>One complete support-resolution workflow</li>
            <li>Grounded answers, tenant isolation, and approval boundaries</li>
            <li>Evaluation results with limitations and failing cases</li>
            <li>A README with setup and handoff instructions</li>
          </ul>
          <div className="subtle-box">
            <p>
              AI tools are welcome. Explain where you used them and how you
              verified the output. The suggested effort is two hours.
            </p>
          </div>
        </section>
        <section className="delivery-form">
          <h3>Your submission</h3>
          {fileName ? (
            <div className="uploaded-file">
              <CheckCircle2 size={23} />
              <div>
                <strong>{fileName}</strong>
                <small>Project uploaded privately · ready to submit</small>
              </div>
            </div>
          ) : null}
          <div className="upload-zone">
            {uploading ? <Spinner /> : <Upload size={26} />}
            <strong>
              {uploading
                ? `Uploading project… ${progress}%`
                : fileName
                  ? "Replace your project ZIP"
                  : "Upload your project ZIP"}
            </strong>
            <p>
              ZIP archive · maximum 50 MB · exclude node_modules and secrets
            </p>
            <input
              aria-label="Project ZIP"
              type="file"
              accept=".zip,application/zip"
              disabled={uploading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                if (
                  !file.name.toLowerCase().endsWith(".zip") ||
                  file.size > 50 * 1024 * 1024
                ) {
                  onError("Choose a ZIP archive smaller than 50 MB.");
                  return;
                }
                setUploading(true);
                setProgress(0);
                try {
                  const item = await uploadArtifact(
                    file,
                    file.name,
                    "project",
                    setProgress,
                  );
                  update("projectArtifactId", item.id);
                  setFileName(file.name);
                  await save();
                } catch (e) {
                  onError((e as Error).message);
                } finally {
                  setUploading(false);
                }
              }}
            />
          </div>
          {[
            [
              "implementation",
              "Implementation notes",
              "What did you build? Which customer needs does it address?",
            ],
            [
              "evaluation",
              "Evaluation results",
              "Which cases pass or fail? Include the test command, results, and what you verified.",
            ],
            [
              "handoff",
              "Handoff & changes from your design",
              "Setup instructions, limitations, remaining risks, and why your implementation differs from the board.",
            ],
          ].map(([id, label, placeholder]) => (
            <div key={id}>
              <label htmlFor={id}>{label}</label>
              <textarea
                id={id}
                value={String(fields[id] || "")}
                onChange={(e) => update(id, e.target.value)}
                placeholder={placeholder}
                maxLength={20000}
              />
            </div>
          ))}
          <Saved status={status} onRetry={() => save().catch(() => {})} />
        </section>
      </div>
    </div>
  );
});
export default Delivery;
