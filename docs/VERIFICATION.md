# Verification record

October 15, 2026. This records observed checks separately from tests that require live configuration.

## Workflow builder demo

- All 25 existing application tests and the production build pass after the builder addition.
- Browser checks confirmed an empty initial canvas, 32 searchable example modules across seven teams, team filtering, add/insert/remove, undo, drag ordering, and keyboard move buttons.
- Edited a step title, duration, timing mode, and context setting; refreshed and confirmed that the browser-local draft restored the same order and settings.
- Completed all four steps of a preview and verified sequential unlocking, submitted states, previous-output context, and disabled context carryover. Escape closes the preview.
- Checked desktop and 390×844 mobile layouts. The mobile page has no horizontal overflow; the settings drawer fits the viewport. Cleared the local QA draft afterward.
- This preview does not exercise real candidate tools or alter invitations or submissions. The existing live assessment remains separate.

## Employer access update

At the owner's request, the employer password gate, login/logout endpoints, and sign-out control have been removed. The dashboard and invitation/configuration endpoints are public demo controls. Earlier login checks below describe the original implementation.

- All 25 application tests and the production build pass.
- Cookie-free HTTP checks confirm that the pipeline and invitation/configuration reads return 200, invitation creation reaches input validation without login, and cross-origin writes remain rejected. No test email was sent.
- Candidate exercise retrieval, submission, LiveKit tokens, artifacts, and unauthenticated agent callbacks still return 401 without the required candidate session or callback secret.

## Passed

- Production Next.js build and strict TypeScript check. Vercel production deployment is reachable at https://certiio-sim-demo.vercel.app; the login page and starter ZIP return 200, and unauthenticated exercise access returns 401.
- 25 application tests covering exactly 100 stable fictional rankings, weighted score consistency, invitation isolation/tampering/expiry, safe email previews, stage order, immutable deadlines, transcript deduplication, immediate transcript retrieval, duplicate submissions, revision conflicts, expiry, artifact ownership/readiness, ZIP/notes requirements, absent-LiveKit gating, resend behavior, email failure state, named customer dispatch, and browser RPC submission/recovery.
- Six Python agent tests covering deduplication across repeated final saves, callback failure retry/pending state, frozen evidence, delayed final-turn capture, bounded finalization, and cancellation recovery.
- Ten HTTP checks against the running app: unauthenticated access, admin/candidate separation, direct-stage bypass rejection, absent-LiveKit rejection, callback authentication, cross-origin rejection, cross-candidate artifact isolation, and authenticated private PNG streaming.
- Browser: employer login, finalized vertical pipeline, Results search, leaderboard/detail score consistency, evidence drawer, keyboard Escape, candidate invitation entry, sequential locks, and transcript context modal.
- Browser: tldraw native shape creation, decision notes, editable-board autosave, private PNG upload, full refresh restoring the drawing/notes/deadline, manual design submission, and delivery unlock.
- Browser: delivery modal displays the actual uploaded design snapshot and notes; private ZIP upload succeeds; malformed ZIP is rejected while the previous valid artifact remains available; notes save; final submission returns to the overview with all three stages Submitted; the employer displays the attempt separately as ungraded.
- Desktop and mobile layout review. Tables scroll within their container on narrow screens; stage cards and candidate flows stack.
- Starter: clean install, TypeScript check, runnable demo, and all 20 evaluation cases execute. The intentionally incomplete baseline scores 6/20; a failing evaluation exit code is expected before candidate implementation.
- Production dependency audit: no known vulnerabilities at implementation time.

The downstream browser journey used isolated local QA attempts with a seeded conversation receipt. These fixtures are ignored, remain local, and are not exposed as a candidate bypass or included in the deployment. They do **not** validate a live conversation.

## Hosted activation

- The account owner accepted Neon's marketplace terms. The separate `certiio-sim-demo-db` resource was provisioned, connected to Vercel, and migrated successfully. All six application tables were verified in the fresh database.
- Hosted employer password login works. A real invitation was sent from the deployed application and Resend accepted it; the invitation record is `sent` with a provider email ID.
- The scoped production invitation link opens successfully and creates a candidate session without starting a timer. The account owner confirmed the invitation arrived in their inbox.
- Hosted checks passed for reusable email previews, Secure/HTTP-only/SameSite session cookies, employer/candidate separation, protected exercise access, server-enforced stage order, authenticated agent callback reachability, and absent-LiveKit gating. No simulation timer was started.

## LiveKit activation

- Deployed the included customer agent to LiveKit Cloud (`CA_rLPxmd5aCQtJ`, `us-east`). Cloud status is Running, and the worker registered with dispatch name `certiio-northstar-customer`.
- Verified the LiveKit URL, credentials, agent name, application origin, and callback secret match between Vercel Production and the agent environment. The deployed app reports LiveKit ready, and authenticated state callbacks succeed.
- Dispatched the named agent into an isolated verification room and confirmed it joined. Removed that temporary room afterward. All three stages on the recipient's invitation remain not started.
- Independent LiveKit Inference calls passed for `google/gemma-4-31b-it`, Fish Audio synthesis with the configured voice, and AssemblyAI transcription of that synthetic test audio. These checks did not create candidate evidence or advance an attempt.
- Investigated the first candidate connection failure. The room contained an unnamed automatic dispatch with no jobs; the application incorrectly treated it as a pending customer. Dispatch reuse now only considers `certiio-northstar-customer`. Regression tests reproduced the skipped dispatch before the fix and passed afterward. The recipient reconnected and started their conversation independently; the investigation did not reset or submit that attempt.
- Fixed the roleplay layout to fill the available viewport immediately. Browser checks at 1280×720, 390×844, and 844×390 verified that the call and transcript remain within the viewport. Long transcripts scroll independently, follow new messages, preserve the reader's position when scrolled back, and support a keyboard-accessible Jump to latest action. The temporary local layout fixture was removed before building.
- Investigated submission timeouts: agent logs showed the voice session closing on a candidate disconnect while the room participant remained present. The agent now retains its voice session across candidate reconnects, ends its job when the session closes, and bounds the complete final-save operation below the RPC deadline. Acknowledged transcript segments are not posted again during submission; final turn processing finishes before persistence is acknowledged.
- A subsequent active attempt exposed a separate browser timeout bug: `performRpc.responseTimeout` uses milliseconds, but the frontend passed `15` as though it were Python's seconds. Reproduced `Response timeout` with the installed JavaScript SDK, then verified the corrected 20,000 ms budget succeeds. The regression test uses the real SDK timer with only the network transport replaced by a delayed acknowledgement/response. Five new tests cover this budget, rejected persistence, already-submitted attempts, deadline/lost-response recovery, and durable-save ordering. The temporary embedded-browser live check could not establish WebRTC because its peer connection rejected a configuration update; it is not counted as a successful live browser submission. Its fixture was removed before deployment.

## Remaining live checks

- The reused Resend key is send-only, so provider delivery-status reads are unavailable. Actual inbox delivery was confirmed by the recipient.
- The local tldraw license loaded successfully. Validation within the hosted candidate workspace remains pending the real roleplay submission, because Solution Design stays locked until then. The inspected license expires November 4, 2026.
- Browser camera/mic permissions, two-way conversation, reconnect, final transcript flush, and a complete real three-stage attempt remain to be checked with the recipient's actual attempt. LiveKit configuration and agent deployment are complete. Follow step 4 in `docs/LIVEKIT.md`.
- Automated deadline checks passed. A real browser conversation running all the way to its 15-minute deadline has not been performed.
- Private upload tests exercised small PNG/ZIP files and malformed-file rejection. The 50 MB cap is enforced by both upload authorization and completion checks; a full 50 MB upload has not been exercised in the browser.

## Repeatable commands

```sh
npm ci
npm run typecheck
npm test
npm run build
npm ci --prefix starter
npm run typecheck --prefix starter
npm run start --prefix starter
# Expected to fail until a candidate implements the solution:
npm test --prefix starter
cd agent
python -m unittest test_agent -v
```

The local QA scripts and fixtures are deliberately excluded from Git and Vercel. CI runs the application tests/build, starter typecheck, and agent outbox tests without service credentials.
