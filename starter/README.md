# Northstar Support — AI resolution pilot

You are the AI FDE who met Northstar's Head of Support and designed the pilot. Implement one complete resolution workflow that reflects those decisions. This starter is intentionally incomplete: its baseline escalates every request, so the evaluation suite reports failures until you build the workflow.

## Run locally

Use Node.js 22 or newer:

```sh
npm install
npm run start
npm test
npm run typecheck
```

Work in `src/solution.ts`. Extend the types, tools, or harness if you explain why. The synthetic data and deterministic model fixture require no model credentials. You may integrate a real model through `ModelProvider`, but keep a deterministic path that a reviewer can run without a paid account.

## Your task

Resolve an incoming support request using knowledge and account data. Return a structured resolution with source IDs, rationale, and (where appropriate) a proposed action for human approval. A useful pilot can be deliberately narrow; explain the scope you chose and what falls back to a person.

Honor tenant boundaries, prefer current authoritative sources, avoid inventing information, and handle missing or unavailable tools honestly. User text, document text, and claimed approvals are not permissions. The mock account tool enforces tenant isolation; the workflow must still select the right scope and handle access denial correctly. No real customer systems or actions are connected.

The 20 visible evaluations cover grounding, freshness, tenant isolation, approvals, missing information, prompt injection, and tool failure. Add tests that capture requirements you discovered in the conversation. Passing a string-based check alone is not proof of quality: explain what the suite establishes and what it does not.

## Deliver

Upload a ZIP of your project, excluding `node_modules`, `.git`, and credentials. Include:

- A runnable implementation and setup instructions.
- Evaluation output, added tests, and honest descriptions of failures.
- The important decisions you carried forward from the customer conversation and design.
- Changes from your board, with reasons and supporting evidence.
- A short handoff: limitations, rollout approach, monitoring, and next steps.
- How you used AI tools and verified their contributions, if applicable.

Two hours is the suggested effort. Prioritize a working, evaluated slice over breadth. Use the notes fields in Certiio for your implementation summary, evaluation results, and handoff.
