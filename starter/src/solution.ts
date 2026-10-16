import type { Ticket, Resolution, ModelProvider } from "./types.js";
import { FixtureModel } from "./tools.js";
export async function resolveTicket(
  ticket: Ticket,
  model: ModelProvider = new FixtureModel(),
): Promise<Resolution> {
  // TODO: implement the workflow you designed. See tools.ts, data.ts, and evaluations.ts.
  // The baseline intentionally escalates everything; it is not a completed solution.
  void ticket;
  void model;
  return {
    status: "escalated",
    answer: "A support specialist needs to review this request.",
    sourceIds: [],
    rationale: "Baseline: workflow not implemented.",
    actionExecuted: false,
  };
}
