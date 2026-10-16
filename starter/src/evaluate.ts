import { evaluations, checkResolution } from "./evaluations.js";
import { resolveTicket } from "./solution.js";
let passed = 0;
for (const test of evaluations) {
  try {
    const result = await resolveTicket(test.ticket);
    const failures = checkResolution(result, test);
    if (!failures.length) passed++;
    console.log(
      `${failures.length ? "FAIL" : "PASS"} ${test.name}${failures.length ? " — " + failures.join("; ") : ""}`,
    );
  } catch (e) {
    console.log(
      `FAIL ${test.name} — unhandled error: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}
console.log(
  `\n${passed}/${evaluations.length} evaluation cases passed.\nAdd evaluations for the requirements you discovered. Report limitations honestly.`,
);
process.exitCode = passed === evaluations.length ? 0 : 1;
