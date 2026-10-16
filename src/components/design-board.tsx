"use client";
import "tldraw/tldraw.css";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Tldraw,
  type Editor,
  getSnapshot,
  loadSnapshot,
  type TLEditorSnapshot,
} from "tldraw";
import type { Run } from "@/lib/domain";
import { api, Saved } from "./shared";
import { uploadArtifact } from "./upload";
export type BoardHandle = { save: () => Promise<void> };
const DesignBoard = forwardRef<
  BoardHandle,
  { run: Run; onError: (message: string) => void; onReady?: () => void }
>(function DesignBoard({ run, onError, onReady }, ref) {
  const editor = useRef<Editor | null>(null),
    latest = useRef(run),
    notesRef = useRef(String(run.payload.notes || "")),
    dirty = useRef(false),
    queue = useRef<Promise<void>>(Promise.resolve()),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    lastImage = useRef(0),
    finalizing = useRef(false),
    loadFailed = useRef(false),
    changes = useRef(0);
  const [notes, setNotes] = useState(notesRef.current),
    [status, setStatus] = useState("saved");
  const backupKey = `certiio-board-${run.invite_id}`;
  const save = (final = false) => {
    if (!final && (finalizing.current || run.status !== "active"))
      return Promise.resolve();
    if (final) {
      if (timer.current) clearTimeout(timer.current);
      finalizing.current = true;
      editor.current?.updateInstanceState({ isReadonly: true });
    }
    const next = queue.current
      .catch(() => {})
      .then(async () => {
        const e = editor.current;
        if (!e || loadFailed.current)
          throw new Error(
            "The drawing workspace is not ready. Reload before submitting.",
          );
        const version = changes.current;
        const snapshot = getSnapshot(e.store);
        const shapes = [...e.getCurrentPageShapeIds()];
        if (final && !shapes.length)
          throw new Error(
            "Add your architecture to the board before submitting.",
          );
        setStatus("saving");
        const payload: Record<string, unknown> = {
          snapshot,
          notes: notesRef.current,
          ...(latest.current.payload.imageArtifactId
            ? { imageArtifactId: latest.current.payload.imageArtifactId }
            : {}),
        };
        try {
          localStorage.setItem(
            backupKey,
            JSON.stringify({ revision: latest.current.revision, payload }),
          );
        } catch {}
        try {
          // Save editable evidence first. Image export/upload failures never discard the board.
          const saved = await api<{ run: Run }>("/api/stages/design/save", {
            revision: latest.current.revision,
            payload,
          });
          latest.current = saved.run;
          if (
            shapes.length &&
            (final || Date.now() - lastImage.current > 10000)
          ) {
            const { blob } = await e.toImage(shapes, {
              format: "png",
              background: true,
              scale: 1,
              padding: 32,
            });
            if (blob.size > 4 * 1024 * 1024)
              throw new Error(
                "The drawing image is too large. Simplify the board before submitting. Your editable board is saved.",
              );
            const image = await uploadArtifact(
              blob,
              "architecture.png",
              "board",
            );
            const imaged = await api<{ run: Run }>("/api/stages/design/save", {
              revision: latest.current.revision,
              payload: { ...payload, imageArtifactId: image.id },
            });
            latest.current = imaged.run;
            lastImage.current = Date.now();
          }
          dirty.current = changes.current !== version;
          if (!dirty.current) localStorage.removeItem(backupKey);
          setStatus(dirty.current ? "saving" : "saved");
        } catch (error) {
          setStatus("error");
          onError((error as Error).message);
          throw error;
        }
      });
    queue.current = next;
    return next.catch((error) => {
      if (final) {
        finalizing.current = false;
        editor.current?.updateInstanceState({ isReadonly: false });
      }
      throw error;
    });
  };
  const schedule = () => {
    if (finalizing.current || run.status !== "active" || loadFailed.current)
      return;
    changes.current++;
    dirty.current = true;
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save().catch(() => {}), 1200);
  };
  useImperativeHandle(ref, () => ({ save: () => save(true) }));
  useEffect(() => {
    const flush = setInterval(() => {
      if (dirty.current) save().catch(() => {});
    }, 10000);
    const leave = (event: BeforeUnloadEvent) => {
      if (dirty.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => {
      clearInterval(flush);
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("beforeunload", leave);
    };
  }, []);
  return (
    <>
      <div className="board-container">
        <Tldraw
          licenseKey={process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY}
          onMount={(e) => {
            editor.current = e;
            e.updateInstanceState({ isReadonly: run.status !== "active" });
            let payload = run.payload;
            try {
              const raw = localStorage.getItem(backupKey);
              if (raw) {
                const cached = JSON.parse(raw);
                if (cached.revision === run.revision) {
                  payload = cached.payload;
                  notesRef.current = String(payload.notes || "");
                  setNotes(notesRef.current);
                  dirty.current = true;
                  onError(
                    "Recovered unsaved work from this browser. It will save automatically.",
                  );
                } else localStorage.removeItem(backupKey);
              }
            } catch {}
            if (payload.snapshot)
              try {
                loadSnapshot(e.store, payload.snapshot as TLEditorSnapshot);
              } catch {
                loadFailed.current = true;
                e.updateInstanceState({ isReadonly: true });
                onError(
                  "Your saved board could not be loaded. Do not submit; reload or contact the hiring team.",
                );
                return;
              }
            e.registerExternalAssetHandler("file", async () => {
              throw new Error(
                "Use native shapes and text in this architecture board.",
              );
            });
            onReady?.();
            return e.store.listen(schedule, {
              source: "user",
              scope: "document",
            });
          }}
        />
      </div>
      <aside className="design-notes">
        <h3>Decision notes</h3>
        <p>
          Explain the tradeoffs behind your architecture. What did you learn
          from the customer, and how did it shape the system?
        </p>
        <textarea
          disabled={run.status !== "active"}
          aria-label="Design decision notes"
          placeholder="Key decisions, assumptions, and tradeoffs…"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            notesRef.current = e.target.value;
            schedule();
          }}
          maxLength={20000}
        />
        <Saved status={status} onRetry={() => save().catch(() => {})} />
      </aside>
    </>
  );
});
export default DesignBoard;
