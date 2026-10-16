export const STAGES = ["roleplay", "design", "delivery"] as const;
export type Stage = (typeof STAGES)[number];
export type RunStatus = "not_started" | "active" | "submitted";
export type Run = {
  invite_id: string;
  stage: Stage;
  status: RunStatus;
  started_at: number | null;
  deadline: number | null;
  submitted_at: number | null;
  submission_reason: string | null;
  revision: number;
  payload: Record<string, unknown>;
};
export type Invitation = {
  id: string;
  name: string;
  email: string;
  created_at: number;
  expires_at: number;
  email_status: string;
  email_id: string | null;
  email_error: string | null;
  email_sent_at: number | null;
};
export type Segment = {
  segment_id: string;
  speaker: "candidate" | "customer";
  text: string;
  occurred_at: number;
  final: boolean;
};
export type Artifact = {
  id: string;
  invite_id: string;
  stage: Stage;
  kind: "board" | "project";
  pathname: string;
  name: string;
  size: number;
  status: string;
  url: string | null;
};
export const stageInfo = {
  roleplay: {
    number: "01",
    title: "Customer Roleplay",
    short: "Discover",
    time: "15 minutes",
    seconds: 900,
    format: "Live customer conversation",
    description:
      "Get to the real problem. Ask the right questions, find the constraints, and align on a pilot worth building.",
    deliverable: "Customer conversation & transcript",
    signals: ["Customer discovery", "Problem framing", "Scope & expectations"],
  },
  design: {
    number: "02",
    title: "Solution Design",
    short: "Design",
    time: "30 minutes",
    seconds: 1800,
    format: "Interactive design board",
    description:
      "Turn what you learned into a system. Map the architecture, make the tradeoffs, and show how you’ll know it works.",
    deliverable: "Architecture board & decision notes",
    signals: [
      "AI architecture",
      "Reliability & boundaries",
      "Evaluation strategy",
    ],
  },
  delivery: {
    number: "03",
    title: "Solution Delivery",
    short: "Deliver",
    time: "~2 hours",
    seconds: null,
    format: "Take-home project",
    description:
      "Close the loop with a working slice. Build, evaluate, and hand over a solution that solves the customer’s actual need.",
    deliverable: "Project ZIP, evaluations & handoff",
    signals: ["Working software", "Evidence & testing", "End-to-end ownership"],
  },
} satisfies Record<
  Stage,
  {
    number: string;
    title: string;
    short: string;
    time: string;
    seconds: number | null;
    format: string;
    description: string;
    deliverable: string;
    signals: string[];
  }
>;
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function stageAllowed(runs: Run[], stage: Stage) {
  return STAGES.slice(0, STAGES.indexOf(stage)).every(
    (s) => runs.find((r) => r.stage === s)?.status === "submitted",
  );
}
export function assertStageAllowed(runs: Run[], stage: Stage) {
  if (!stageAllowed(runs, stage))
    throw new AppError(409, "Complete the previous simulation first.");
}
export function remainingSeconds(run: Pick<Run, "deadline">, now = Date.now()) {
  return run.deadline
    ? Math.max(0, Math.ceil((run.deadline - now) / 1000))
    : null;
}
export const rubric = [
  {
    name: "Customer discovery",
    weight: 20,
    description: "Understands the customer before proposing the solution.",
  },
  {
    name: "Solution design",
    weight: 25,
    description: "Makes practical architecture and reliability decisions.",
  },
  {
    name: "Solution delivery",
    weight: 30,
    description: "Ships a working, tested, explainable implementation.",
  },
  {
    name: "Cross-stage execution",
    weight: 25,
    description: "Carries customer needs all the way into verified outcomes.",
  },
];
export function weightedScore(scores: number[]) {
  return (
    Math.round(
      scores.reduce(
        (sum, score, i) => sum + (score * rubric[i].weight) / 100,
        0,
      ) * 10,
    ) / 10
  );
}
