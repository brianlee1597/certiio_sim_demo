import { resolveTicket } from "./solution.js";
console.log(
  await resolveTicket({
    id: "demo",
    tenantId: "acme",
    accountId: "acme-001",
    question: "How do I configure SSO?",
  }),
);
