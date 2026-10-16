# Verification record

October 15, 2026. This records observed checks separately from tests that require live configuration.

## Passed

- Production Next.js build and strict TypeScript check. Vercel production deployment is reachable at https://certiio-sim-demo.vercel.app; the login page and starter ZIP return 200, and unauthenticated exercise access returns 401.
- 15 application tests covering exactly 100 stable fictional rankings, weighted score consistency, invitation isolation/tampering/expiry, safe email previews, stage order, immutable deadlines, transcript deduplication, immediate transcript retrieval, duplicate submissions, revision conflicts, expiry, artifact ownership/readiness, ZIP/notes requirements, absent-LiveKit gating, resend behavior, and email failure state.
- Three Python agent tests covering deduplication, callback failure retry/pending state, and frozen evidence.
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

## Awaiting LiveKit configuration

- The reused Resend key is send-only, so provider delivery-status reads are unavailable. Actual inbox delivery was confirmed by the recipient.
- The local tldraw license loaded successfully. Validation within the hosted candidate workspace remains pending the LiveKit setup, because Solution Design stays locked until the real roleplay is submitted. The inspected license expires November 4, 2026.
- LiveKit camera/mic permissions, two-way speech, model inference, dispatch, reconnect, final transcript flush, and a complete real three-stage attempt await the user's LiveKit project credentials and deployed customer agent. Follow `docs/LIVEKIT.md`.
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
