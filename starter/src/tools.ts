import { accounts, documents } from "./data.js";
import type { KnowledgeDocument, ModelProvider, Ticket } from "./types.js";
export class ToolUnavailableError extends Error {}
export class AccountAccessError extends Error {}
export function getAccount(ticket: Ticket) {
  if (ticket.toolFailure)
    throw new ToolUnavailableError("Account service timed out.");
  const account = accounts.find(
    (a) => a.id === ticket.accountId && a.tenantId === ticket.tenantId,
  );
  if (!account)
    throw new AccountAccessError("Account not found in the authorized tenant.");
  return account;
}
export function availableKnowledge(
  tenantId: Ticket["tenantId"],
): KnowledgeDocument[] {
  return documents.filter(
    (d) => d.tenantId === "shared" || d.tenantId === tenantId,
  );
}
/** Deterministic fixture only: selected evidence must be validated by your workflow. */
export class FixtureModel implements ModelProvider {
  async generate({ documents }: Parameters<ModelProvider["generate"]>[0]) {
    return documents.map((d) => d.text).join("\n");
  }
}
