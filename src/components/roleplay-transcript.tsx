"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import type { Segment } from "@/lib/domain";

export function RoleplayTranscript({ transcript, caption }: { transcript: Segment[]; caption?: string }) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const [following, setFollowing] = useState(true);
  const scrollToLatest = () => {
    const node = viewport.current;
    if (node) node.scrollTop = node.scrollHeight;
  };
  useLayoutEffect(() => {
    if (follow.current) scrollToLatest();
  }, [transcript, caption, following]);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(() => {
      if (follow.current) scrollToLatest();
    });
    if (viewport.current) observer.observe(viewport.current);
    if (content.current) observer.observe(content.current);
    return () => observer.disconnect();
  }, []);
  return (
    <aside className="live-transcript" aria-labelledby="conversation-transcript-title">
      <h3 id="conversation-transcript-title">Conversation transcript</h3>
      <p>Captured as you talk. This context follows you into Solution Design.</p>
      <div
        className="transcript-scroll"
        ref={viewport}
        role="region"
        aria-label="Conversation messages"
        tabIndex={0}
        onScroll={(event) => {
          const node = event.currentTarget;
          follow.current = node.scrollHeight - node.scrollTop - node.clientHeight < 48;
          setFollowing(follow.current);
        }}
      >
        <div className="transcript-list" ref={content}>
          {transcript.map((segment) => (
            <div key={segment.segment_id} className={`transcript-message ${segment.speaker}`}>
              <div><strong>{segment.speaker === "customer" ? "Maya" : "You"}</strong><span>Saved</span></div>
              <p>{segment.text}</p>
            </div>
          ))}
          {caption && (
            <div className="transcript-message">
              <div><strong>Live caption</strong><span>Transcribing…</span></div>
              <p>{caption}</p>
            </div>
          )}
          {!transcript.length && !caption && <p className="fineprint">Your transcript will appear once the conversation begins.</p>}
        </div>
      </div>
      {!following && (
        <button className="transcript-latest" onClick={() => {
          follow.current = true;
          setFollowing(true);
          scrollToLatest();
        }}><ArrowDown size={14} /> Jump to latest</button>
      )}
    </aside>
  );
}
