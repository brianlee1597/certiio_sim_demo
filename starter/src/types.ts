export type TenantId = "acme" | "beacon";
export type Ticket = {
  id: string;
  tenantId: TenantId;
  accountId: string;
  question: string;
  toolFailure?: boolean;
};
export type KnowledgeDocument = {
  id: string;
  tenantId: TenantId | "shared";
  title: string;
  text: string;
  topic: string;
  updatedAt: string;
  deprecated?: boolean;
};
export type Resolution = {
  status: "answered" | "needs_approval" | "escalated";
  answer: string;
  sourceIds: string[];
  rationale: string;
  proposedAction?: {
    type: "refund" | "plan_change";
    accountId: string;
    reason: string;
  };
  // The pilot must never claim it has performed an account mutation.
  actionExecuted: boolean;
};
export interface ModelProvider {
  generate(input: {
    question: string;
    documents: KnowledgeDocument[];
  }): Promise<string>;
}
