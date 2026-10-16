export const moduleTeams = [
  "Operations",
  "Sales",
  "Legal",
  "Customer success",
  "Finance",
  "People",
  "Engineering",
] as const;
export type ModuleTeam = (typeof moduleTeams)[number];
export type WorkflowModule = {
  id: string;
  team: ModuleTeam;
  title: string;
  description: string;
  format: string;
  minutes: number;
  output: string;
  signals: string[];
  brief: string;
};

// Fictional module definitions for the builder preview. They do not launch
// assessment tools or change the live, three-stage candidate exercise.
export const workflowModules: WorkflowModule[] = [
  {
    id: "incident-triage",
    team: "Operations",
    title: "Incident triage",
    description: "Make the call when everything feels urgent.",
    format: "Inbox simulation",
    minutes: 25,
    output: "Prioritized response plan",
    signals: ["Prioritization", "Judgment", "Communication"],
    brief:
      "A fictional fulfillment team has a delayed shipment, an inventory mismatch, and an upset customer. Triage the inbox, assign owners, and write your first update.",
  },
  {
    id: "process-mapping",
    team: "Operations",
    title: "Process mapping",
    description: "Find the friction in an everyday workflow.",
    format: "Whiteboard",
    minutes: 30,
    output: "Process map & improvements",
    signals: ["Systems thinking", "Root cause analysis"],
    brief:
      "Map a fictional order-to-delivery process from a set of team notes. Identify the biggest bottleneck and propose one change, including how you would measure its effect.",
  },
  {
    id: "vendor-selection",
    team: "Operations",
    title: "Vendor selection",
    description: "Balance price, reliability, and hidden costs.",
    format: "Decision exercise",
    minutes: 25,
    output: "Vendor recommendation",
    signals: ["Tradeoffs", "Commercial judgment"],
    brief:
      "Compare three fictional vendor proposals with different prices, service levels, and implementation risks. Recommend a vendor and explain what you would verify before committing.",
  },
  {
    id: "capacity-planning",
    team: "Operations",
    title: "Capacity planning",
    description: "Turn uncertain demand into a practical plan.",
    format: "Spreadsheet",
    minutes: 35,
    output: "Capacity model & assumptions",
    signals: ["Quantitative reasoning", "Planning"],
    brief:
      "Use a synthetic demand forecast and staffing table to plan next month's coverage. Show a base case, a demand spike, and the assumptions that would change your decision.",
  },
  {
    id: "quality-audit",
    team: "Operations",
    title: "Quality audit",
    description: "Spot patterns before they become recurring issues.",
    format: "Document review",
    minutes: 25,
    output: "Audit findings & action list",
    signals: ["Attention to detail", "Process improvement"],
    brief:
      "Review a sample of fictional service records. Separate isolated mistakes from systemic issues and propose a focused follow-up audit.",
  },
  {
    id: "sales-discovery",
    team: "Sales",
    title: "Discovery call",
    description: "Find the business need behind the feature request.",
    format: "AI roleplay",
    minutes: 15,
    output: "Call transcript & discovery notes",
    signals: ["Listening", "Qualification", "Business impact"],
    brief:
      "Meet a fictional prospect evaluating a new operations platform. Understand the problem, decision process, constraints, and a credible next step without rushing to a pitch.",
  },
  {
    id: "objection-handling",
    team: "Sales",
    title: "Objection handling",
    description: "Respond to skepticism with substance.",
    format: "AI roleplay",
    minutes: 15,
    output: "Conversation transcript",
    signals: ["Empathy", "Adaptability", "Value articulation"],
    brief:
      "A fictional buyer is worried about migration cost and team adoption. Explore the concerns, respond honestly, and agree on what evidence would help them decide.",
  },
  {
    id: "account-research",
    team: "Sales",
    title: "Account research",
    description: "Build a point of view worth a buyer's time.",
    format: "Research brief",
    minutes: 25,
    output: "Account brief & outreach",
    signals: ["Research synthesis", "Relevance"],
    brief:
      "Use a fictional company packet to identify likely priorities and stakeholders. Draft a short account hypothesis and a personalized first message; distinguish facts from assumptions.",
  },
  {
    id: "proposal-writing",
    team: "Sales",
    title: "Proposal writing",
    description: "Connect a customer's needs to a clear offer.",
    format: "Writing exercise",
    minutes: 40,
    output: "Customer proposal",
    signals: ["Clarity", "Commercial reasoning"],
    brief:
      "Turn fictional discovery notes into a concise proposal. Define scope, expected outcomes, costs, dependencies, and the questions still open.",
  },
  {
    id: "pipeline-review",
    team: "Sales",
    title: "Pipeline review",
    description: "Make a forecast that stands up to scrutiny.",
    format: "CRM simulation",
    minutes: 25,
    output: "Forecast & deal action plan",
    signals: ["Forecasting", "Evidence-based judgment"],
    brief:
      "Review six synthetic opportunities with incomplete notes. Update your forecast, identify unsupported assumptions, and choose the next action for each deal.",
  },
  {
    id: "contract-review",
    team: "Legal",
    title: "Contract review",
    description: "Find material risks and propose practical edits.",
    format: "Document markup",
    minutes: 40,
    output: "Annotated contract & risk summary",
    signals: ["Issue spotting", "Risk prioritization", "Clarity"],
    brief:
      "Review a fictional services agreement against a supplied company playbook. Flag material departures, suggest alternative language, and identify issues requiring specialist review.",
  },
  {
    id: "privacy-assessment",
    team: "Legal",
    title: "Privacy assessment",
    description: "Trace how data moves through a new product.",
    format: "Case analysis",
    minutes: 35,
    output: "Data map & review questions",
    signals: ["Risk analysis", "Structured reasoning"],
    brief:
      "Review a fictional product's data flow using an included policy packet. Identify missing facts, data-minimization opportunities, and the approvals needed before a pilot.",
  },
  {
    id: "compliance-triage",
    team: "Legal",
    title: "Compliance triage",
    description: "Separate urgent issues from routine questions.",
    format: "Inbox simulation",
    minutes: 25,
    output: "Triage log & escalation plan",
    signals: ["Judgment", "Escalation", "Prioritization"],
    brief:
      "Sort a fictional legal inbox using supplied internal guidelines. Explain your priorities, request the right facts, and draft a clear response to the most urgent issue.",
  },
  {
    id: "negotiation-memo",
    team: "Legal",
    title: "Negotiation memo",
    description: "Translate legal concerns into business choices.",
    format: "Writing exercise",
    minutes: 30,
    output: "Negotiation positions & fallback options",
    signals: ["Commercial judgment", "Written communication"],
    brief:
      "Prepare a negotiation memo for a fictional partnership using an agreed risk playbook. State the must-haves, reasonable fallback positions, and tradeoffs for the business owner.",
  },
  {
    id: "support-escalation",
    team: "Customer success",
    title: "Support escalation",
    description: "Bring clarity to a difficult customer moment.",
    format: "AI roleplay",
    minutes: 20,
    output: "Conversation & recovery plan",
    signals: ["Empathy", "Ownership", "Expectation setting"],
    brief:
      "A fictional customer has experienced repeated service failures. Acknowledge the impact, investigate without overpromising, and agree on owners and the next update.",
  },
  {
    id: "onboarding-design",
    team: "Customer success",
    title: "Customer onboarding",
    description: "Design a path to the first meaningful outcome.",
    format: "Planning exercise",
    minutes: 30,
    output: "Onboarding plan & success measures",
    signals: ["Customer outcomes", "Planning"],
    brief:
      "Create a four-week onboarding plan for a fictional customer with limited time and two distinct user groups. Define milestones, risks, and evidence of adoption.",
  },
  {
    id: "renewal-conversation",
    team: "Customer success",
    title: "Renewal conversation",
    description: "Understand whether the product has earned its place.",
    format: "AI roleplay",
    minutes: 20,
    output: "Renewal transcript & next steps",
    signals: ["Value discovery", "Commercial judgment"],
    brief:
      "A fictional customer is questioning renewal after uneven adoption. Explore realized value, remaining obstacles, and a credible plan without relying on a discount.",
  },
  {
    id: "knowledge-rewrite",
    team: "Customer success",
    title: "Knowledge base rewrite",
    description: "Make a confusing answer genuinely usable.",
    format: "Writing exercise",
    minutes: 30,
    output: "Revised article & verification notes",
    signals: ["Clarity", "Customer empathy", "Accuracy"],
    brief:
      "Rewrite a fictional help article using support tickets and product notes. Resolve contradictory instructions, identify facts to verify, and make the answer easy to follow.",
  },
  {
    id: "forecast-model",
    team: "Finance",
    title: "Forecast modeling",
    description: "Make assumptions visible, then test them.",
    format: "Spreadsheet",
    minutes: 40,
    output: "Forecast & sensitivity analysis",
    signals: ["Modeling", "Assumption quality"],
    brief:
      "Build a quarterly forecast from synthetic revenue and cost data. Explain the drivers, run a downside case, and identify which assumptions matter most.",
  },
  {
    id: "budget-tradeoffs",
    team: "Finance",
    title: "Budget tradeoffs",
    description: "Allocate scarce resources with a clear rationale.",
    format: "Decision exercise",
    minutes: 25,
    output: "Budget recommendation",
    signals: ["Prioritization", "Quantitative reasoning"],
    brief:
      "Evaluate four fictional team requests against a fixed budget. Show your allocation, what you would defer, and the evidence that could change your priorities.",
  },
  {
    id: "reconciliation",
    team: "Finance",
    title: "Revenue reconciliation",
    description: "Follow the numbers to explain a mismatch.",
    format: "Spreadsheet",
    minutes: 30,
    output: "Reconciliation & exception log",
    signals: ["Accuracy", "Investigation", "Controls"],
    brief:
      "Reconcile synthetic invoice, payment, and reporting records. Identify timing differences and errors, then document the checks needed to prevent recurrence.",
  },
  {
    id: "investment-case",
    team: "Finance",
    title: "Business case",
    description: "Test whether an internal investment is worth it.",
    format: "Case analysis",
    minutes: 45,
    output: "Business case & recommendation",
    signals: ["Financial reasoning", "Risk analysis"],
    brief:
      "Assess a fictional automation project using supplied costs and benefit estimates. Model the payback, challenge assumptions, and recommend a staged decision.",
  },
  {
    id: "hiring-calibration",
    team: "People",
    title: "Hiring calibration",
    description: "Turn inconsistent feedback into an evidence-based review.",
    format: "Case analysis",
    minutes: 25,
    output: "Rubric-based feedback summary",
    signals: ["Evidence quality", "Consistency", "Fairness"],
    brief:
      "Review entirely fictional interview notes against a supplied job rubric. Identify unsupported claims, evidence gaps, and useful follow-up questions without relying on personal characteristics.",
  },
  {
    id: "difficult-conversation",
    team: "People",
    title: "Difficult conversation",
    description: "Deliver clear feedback while making space to listen.",
    format: "AI roleplay",
    minutes: 20,
    output: "Conversation & follow-up plan",
    signals: ["Empathy", "Specificity", "Coaching"],
    brief:
      "Discuss a fictional missed project commitment with a teammate. Use observable facts, understand the context, and agree on practical support and next steps.",
  },
  {
    id: "employee-onboarding",
    team: "People",
    title: "Employee onboarding",
    description: "Help a new teammate become effective sooner.",
    format: "Planning exercise",
    minutes: 30,
    output: "30-day onboarding plan",
    signals: ["Planning", "Collaboration", "Role clarity"],
    brief:
      "Design onboarding for a fictional distributed team. Define role expectations, learning milestones, support contacts, and ways to check progress without creating busywork.",
  },
  {
    id: "policy-communication",
    team: "People",
    title: "Policy communication",
    description: "Make a complex change clear and actionable.",
    format: "Writing exercise",
    minutes: 25,
    output: "Announcement & manager FAQ",
    signals: ["Clarity", "Audience awareness"],
    brief:
      "Explain a fictional internal process change using a supplied policy brief. Write an announcement and FAQ that clearly separate confirmed decisions from open questions.",
  },
  {
    id: "customer-roleplay",
    team: "Engineering",
    title: "Technical discovery",
    description: "Translate a customer's problem into a useful pilot.",
    format: "AI roleplay",
    minutes: 15,
    output: "Discovery transcript & requirements",
    signals: ["Problem framing", "Customer discovery"],
    brief:
      "Meet a fictional support leader considering an AI resolution pilot. Discover workflows, constraints, approval boundaries, and measurable success before proposing a solution.",
  },
  {
    id: "system-design",
    team: "Engineering",
    title: "System design",
    description: "Make architecture decisions visible.",
    format: "Whiteboard",
    minutes: 30,
    output: "Architecture board & decision notes",
    signals: ["Architecture", "Tradeoffs", "Reliability"],
    brief:
      "Design a fictional AI support workflow. Show knowledge ingestion, retrieval, account tools, permissions, evaluation, and rollout; explain the tradeoffs behind your choices.",
  },
  {
    id: "working-slice",
    team: "Engineering",
    title: "Build a working slice",
    description: "Ship a small solution that closes the loop.",
    format: "Take-home project",
    minutes: 120,
    output: "Project ZIP, tests & handoff",
    signals: ["Execution", "Testing", "Ownership"],
    brief:
      "Implement one useful workflow from a fictional project brief. Include a runnable example, meaningful tests, limitations, and a concise handoff explaining changes from the original design.",
  },
  {
    id: "debugging",
    team: "Engineering",
    title: "Debug an incident",
    description: "Find the cause, then verify the repair.",
    format: "Code exercise",
    minutes: 35,
    output: "Patch & investigation notes",
    signals: ["Debugging", "Hypothesis testing"],
    brief:
      "Investigate a synthetic service failure using sample logs and a small codebase. Reproduce the issue, explain the cause, and show how you verified a targeted fix.",
  },
  {
    id: "model-evaluation",
    team: "Engineering",
    title: "Model evaluation",
    description: "Define what good looks like beyond a polished demo.",
    format: "Evaluation lab",
    minutes: 40,
    output: "Evaluation cases & findings",
    signals: ["Evaluation design", "Failure analysis"],
    brief:
      "Assess a fictional AI assistant using synthetic examples. Define criteria, cover difficult cases, analyze failures, and recommend a launch decision with clear limitations.",
  },
  {
    id: "security-review",
    team: "Engineering",
    title: "Security review",
    description: "Find risky boundaries before a pilot launches.",
    format: "Document review",
    minutes: 35,
    output: "Threat review & mitigations",
    signals: ["Threat modeling", "Prioritization"],
    brief:
      "Review a fictional architecture and permission model. Identify likely failure paths, prioritize mitigations, and propose tests for tenant isolation and restricted actions.",
  },
];

export type WorkflowStep = {
  id: string;
  moduleId: string;
  title: string;
  minutes: number;
  timing: "timed" | "suggested";
  brief: string;
  carryContext: boolean;
};
export type WorkflowDraft = { version: 1; name: string; steps: WorkflowStep[] };
export const emptyWorkflow = (): WorkflowDraft => ({
  version: 1,
  name: "Untitled workflow",
  steps: [],
});
export const moduleFor = (id: string) =>
  workflowModules.find((m) => m.id === id)!;
export function durationLabel(minutes: number) {
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`
    : `${minutes}m`;
}
export function restoreWorkflow(raw: string): WorkflowDraft {
  const value = JSON.parse(raw) as WorkflowDraft;
  if (
    value.version !== 1 ||
    typeof value.name !== "string" ||
    value.name.length > 100 ||
    !Array.isArray(value.steps) ||
    value.steps.length > 30
  )
    throw new Error("Invalid draft");
  const ids = new Set<string>();
  for (const step of value.steps) {
    if (
      !step ||
      typeof step.id !== "string" ||
      ids.has(step.id) ||
      !moduleFor(step.moduleId) ||
      typeof step.title !== "string" ||
      !step.title.trim() ||
      step.title.length > 100 ||
      !Number.isInteger(step.minutes) ||
      step.minutes < 1 ||
      step.minutes > 240 ||
      !["timed", "suggested"].includes(step.timing) ||
      typeof step.brief !== "string" ||
      step.brief.length > 4000 ||
      typeof step.carryContext !== "boolean"
    )
      throw new Error("Invalid step");
    ids.add(step.id);
  }
  return value;
}
