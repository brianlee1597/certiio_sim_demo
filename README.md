# Certiio work simulations

A standalone AI Forward Deployed Engineer hiring demo. The finalized pipeline, invitation manager, candidate workspaces, and 100 fictional ranked applicants live in one Next.js application. The customer agent deploys separately to LiveKit Cloud.

Deployment: [certiio-sim-demo.vercel.app](https://certiio-sim-demo.vercel.app). Hosted login and invitations await the isolated Neon database connection; live conversation additionally requires the LiveKit handoff.

## Run locally

Use Node 22 and npm. Copy `.env.example` to `.env.local`, fill the required values, and run:

```sh
npm ci
npm run dev
```

Without `DATABASE_URL`, development uses an isolated PGlite database under `.data/postgres`. Hosted production **requires** Postgres. This fallback changes storage only; it does not simulate a LiveKit conversation or bypass any stage.

Open `http://localhost:3000` and sign in with `DEMO_ADMIN_PASSWORD`. The dashboard opens directly on the finalized pipeline. Use Invites to email a private exercise link. Invites expire after seven days; email previews do not start an attempt. Resending preserves the link, progress, and original expiry. For an expired invitation, create a new one.

## Environment

| Variable | Purpose |
| --- | --- |
| `APP_URL` | Canonical HTTPS deployment origin; localhost in development |
| `DEMO_ADMIN_PASSWORD` | Employer demo login |
| `SESSION_SECRET` | At least 32 random characters; signs invite links |
| `DATABASE_URL` | Isolated Neon Postgres connection URL |
| `BLOB_READ_WRITE_TOKEN` | Token for the demo's **private** Vercel Blob store |
| `NEXT_PUBLIC_TLDRAW_LICENSE_KEY` | tldraw browser license; version pinned to 4.5.12 |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Resend key and verified sender |
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | Same LiveKit Cloud project as the agent |
| `LIVEKIT_AGENT_NAME` | `certiio-northstar-customer` in app and agent |
| `AGENT_CALLBACK_SECRET` | At least 32 random characters, identical in app and agent |

The existing local Certiio tldraw and Resend configuration is reused only through ignored environment files. Do not copy the main Certiio database or use its artifact store. The inspected tldraw evaluation license expires November 4, 2026; validate the deployed origin and replace it before expiry. See [tldraw licensing](https://tldraw.dev/community/license).

Generate each secret separately with `openssl rand -hex 32`. Changing `SESSION_SECRET` invalidates invitation URLs. Keep all `.env*` files except examples out of Git.

## Deploy to Vercel

1. Import `brianlee1597/certiio_sim_demo` as a separate Next.js project, Node 22, repository root.
2. Connect an isolated Neon database and a **private** Vercel Blob store. Enable the resources for Production. If Vercel asks for marketplace terms, the account owner must accept those terms before provisioning.
3. Add the variables above. Use the final production origin for `APP_URL`. Keep server secrets non-public. The tldraw browser key intentionally uses `NEXT_PUBLIC_`.
4. Pull the deployment environment into the ignored `.env.local`, then run `npm run db:migrate`. Schema creation is idempotent.
5. Deploy with `npx vercel --prod`. Redeploy after changing environment values; public tldraw configuration is embedded at build time.
6. Follow [LiveKit setup](docs/LIVEKIT.md), then complete [verification](docs/VERIFICATION.md).

Do not enable Vercel deployment protection on the production candidate origin: candidates and authenticated LiveKit/Blob service callbacks must be able to reach it. Employer access remains protected by the application's password and HTTP-only session. Preview deployments may keep Vercel protection and must use isolated service settings if exercised.

## Candidate flow

- **Customer Roleplay, 15 minutes:** camera and microphone preflight, a real LiveKit room, fixed-scenario AI customer, mute controls, live captions, durable timestamped transcript. The timer waits for an agent and active camera/microphone tracks. Without LiveKit, the page explains the setup requirement and cannot advance.
- **Solution Design, 30 minutes:** native tldraw board and tradeoff notes. The board loads before the timer begins. Editable snapshots autosave; PNG previews upload privately. The actual roleplay transcript is accessible in Context.
- **Solution Delivery, suggested two hours:** downloadable TypeScript starter, private ZIP up to 50 MB, implementation/evaluation/handoff notes. No enforced countdown. Context includes the transcript, drawing, and design notes.

Timers and stage order are enforced on the server. Refreshes preserve deadlines. Expiry freezes the last durably saved evidence, even if the browser is disconnected; the next read materializes the expired state. Manual submissions return the same stored receipt on retry. Autosaves use revision checks to prevent a second tab overwriting newer evidence. Candidate submissions are shown as **submitted and ungraded**.

The server never extracts or executes candidate ZIPs. Artifact endpoints check ownership, stage, size, and file signature, and stream downloads through authenticated routes. Filenames and content types are fixed for downloads.

## Connected challenge and scoring

Northstar Support wants a measurable AI resolution pilot across tenant-specific knowledge and accounts. Candidates discover needs, design permission boundaries and evaluation, then implement a working slice. The private agent scenario includes workflow details, stale documents, approval requirements, budget, success criteria, and a small rollout. It reveals details when asked and challenges unsupported claims.

The downloadable [starter](starter/README.md) includes synthetic tickets, two tenants, scoped account APIs, model-provider interfaces, deterministic fixtures, and 20 evaluation cases. Its baseline intentionally fails cases: candidates implement `resolveTicket`. Build the distributable with `npm run starter:build`.

`src/lib/candidates.ts` deterministically seeds **exactly 100 fictional completed applicants**. They are labeled synthetic in the leaderboard and detail views. Scores use discovery 20%, design 25%, delivery 30%, and cross-stage execution 25%. Profiles include strong communication with weak implementation, sophisticated designs missing constraints, and simpler solutions satisfying the actual need. Evidence follows requirements through design, implementation, and tests. These examples are illustrative; the app does not invent scores for actual submissions.

## Code map

- `src/app`: Next.js pages and authenticated API router.
- `src/components`: employer dashboard, candidate overview, context, workspaces.
- `src/server`: session security, transactional stage state, email, LiveKit, schema.
- `src/lib`: domain types, stage briefs, deterministic synthetic ranking.
- `agent`: Python LiveKit customer, transcript retry outbox, Dockerfile, tests.
- `starter`: candidate take-home project; `public/northstar-starter.zip` is the download.

## Checks

```sh
npm run typecheck
npm test
npm run build
cd agent
python -m unittest test_agent -v
```

See [verification notes](docs/VERIFICATION.md) for performed browser checks and checks awaiting infrastructure or live credentials. This is a demonstration product, not a validated hiring assessment or an automatic employment decision system. Appearance, camera footage, accent, and protected characteristics are not grading dimensions.
