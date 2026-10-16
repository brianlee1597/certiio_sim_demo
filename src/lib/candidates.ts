import { weightedScore } from "./domain";
const first = [
  "Avery",
  "Jordan",
  "Morgan",
  "Taylor",
  "Riley",
  "Casey",
  "Alex",
  "Jamie",
  "Quinn",
  "Cameron",
  "Drew",
  "Reese",
  "Skyler",
  "Rowan",
  "Parker",
  "Emery",
  "Finley",
  "Sage",
  "Hayden",
  "Blake",
];
const last = ["Chen", "Patel", "Rivera", "Kim", "Bennett"];
const profiles = [
  {
    profile: "Customer-led builder",
    base: [92, 88, 93, 95],
    signal: "Turns customer constraints into verified behavior",
    gap: "Could make the rollout ownership more explicit.",
    quote:
      "Before we automate a refund, who is accountable for approving it? I’d start with recommendations and measure safe resolutions.",
    design:
      "Tenant-scoped retrieval, read-only account tools, explicit approval gate, and an evaluation loop.",
    delivery:
      "The approval boundary and tenant isolation are enforced in code. Regression cases cover conflicting documentation and tool timeouts.",
    chain: [
      "Identified refund approval as a launch constraint",
      "Designed a human approval boundary before account mutations",
      "Implemented a proposed-action workflow; blocked execution without approval",
      "Passing approval and authorization regression tests",
    ],
    tests: 19,
  },
  {
    profile: "Pragmatic problem solver",
    base: [86, 82, 94, 91],
    signal: "Ships a small, reliable slice with clear evaluation",
    gap: "Capacity planning is lighter than the rest of the design.",
    quote:
      "For the pilot, let’s handle grounded how-to answers and escalation. We can expand once we know where it fails.",
    design:
      "Simple retrieval pipeline with citations, tenant filters, abstention, and a human support queue.",
    delivery:
      "A focused implementation solves the highest-volume ticket class. The handoff clearly separates shipped behavior from future work.",
    chain: [
      "Narrowed the pilot to repetitive how-to requests",
      "Removed autonomous mutations from the pilot architecture",
      "Shipped retrieval with source citations and abstention",
      "Evaluation demonstrates grounding and no cross-tenant answers",
    ],
    tests: 18,
  },
  {
    profile: "Strong discovery, uneven delivery",
    base: [91, 79, 66, 70],
    signal: "Asks precise customer and workflow questions",
    gap: "Approval is described in the design but not enforced in the implementation.",
    quote:
      "What does success look like for the support team, and which requests must always reach a person?",
    design:
      "Good discovery notes and a sensible architecture, but unclear tool contracts and enforcement points.",
    delivery:
      "The happy path works, but an account-change tool can bypass the proposed approval flow. Failure handling is incomplete.",
    chain: [
      "Discovered the need for approval on account changes",
      "Included approval in the architecture sketch",
      "Implementation bypasses the gate for one account tool",
      "Approval-bypass and timeout regression cases fail",
    ],
    tests: 13,
  },
  {
    profile: "Architecture ahead of customer fit",
    base: [65, 91, 78, 61],
    signal: "Explains infrastructure and model tradeoffs clearly",
    gap: "The multi-agent design exceeds the customer’s pilot scope and budget.",
    quote:
      "We could use separate planning and verification agents. I’d like to show you a scalable orchestration architecture.",
    design:
      "Detailed multi-agent architecture, observability, and queues; limited connection to the small pilot budget.",
    delivery:
      "Several components work in isolation, but the primary support workflow lacks a complete end-to-end evaluation.",
    chain: [
      "Customer asked for a limited two-week pilot",
      "Designed multiple services without validating the operational budget",
      "Delivered components but no deployable pilot slice",
      "Unit checks pass; the complete workflow remains unverified",
    ],
    tests: 15,
  },
  {
    profile: "Promising, needs stronger validation",
    base: [75, 73, 67, 66],
    signal: "Communicates decisions and demonstrates a working prototype",
    gap: "Missing regression coverage for stale sources and tenant boundaries.",
    quote:
      "I can prototype this workflow quickly, then we can test it with a few representative support tickets.",
    design:
      "A plausible retrieval and answer flow, with evaluation and data access boundaries left underspecified.",
    delivery:
      "The prototype handles common questions. Its evidence does not establish reliable behavior on conflicting sources or tenant isolation.",
    chain: [
      "Recognized that documentation quality is inconsistent",
      "Added retrieval but left freshness rules implicit",
      "Returned an answer from a stale source in one case",
      "No demonstrated fix or regression test for the stale-source failure",
    ],
    tests: 12,
  },
];
export type Candidate = ReturnType<typeof makeCandidate>;
function makeCandidate(i: number) {
  const profileIndex = i < 6 ? i % 2 : (i * 7 + 3) % profiles.length;
  const p = profiles[profileIndex];
  const scores = p.base.map((v, j) =>
    Math.max(42, Math.min(98, v + ((i * (j + 3) + j * 2) % 13) - 6)),
  );
  const overall = weightedScore(scores);
  return {
    id: `candidate-${String(i + 1).padStart(3, "0")}`,
    name: `${first[i % 20]} ${last[Math.floor(i / 20)]}`,
    initials: `${first[i % 20][0]}${last[Math.floor(i / 20)][0]}`,
    scores,
    overall,
    profileIndex,
    ...p,
    tests: Math.max(8, Math.min(20, Math.round(scores[2] / 5))),
    rank: 0,
    minutes: 12 + (i % 4),
    designMinutes: 24 + (i % 7),
    completed: `2026-10-${String(1 + (i % 14)).padStart(2, "0")}`,
    recommendation:
      overall >= 85
        ? "Strong signal"
        : overall >= 73
          ? "Worth a closer look"
          : "Mixed evidence",
  };
}
export const candidates: Candidate[] = Array.from({ length: 100 }, (_, i) =>
  makeCandidate(i),
)
  .sort(
    (a, b) =>
      b.overall - a.overall ||
      b.scores[3] - a.scores[3] ||
      a.id.localeCompare(b.id),
  )
  .map((c, i) => ({ ...c, rank: i + 1 }));
