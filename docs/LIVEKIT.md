# LiveKit handoff

The app requires a real LiveKit customer conversation. There is no simulated roleplay or skip button. Camera footage is neither recorded by this app nor used for grading; the AI agent consumes audio only.

## 1. Create the project

Create a separate project in [LiveKit Cloud](https://cloud.livekit.io/). Enable LiveKit Inference and ensure the project has available inference/agent capacity. Copy its WebSocket URL, API key, and API secret. LiveKit Inference supplies speech recognition, language generation, speech synthesis, and turn detection without separate provider accounts. Reference: [voice AI quickstart](https://docs.livekit.io/agents/start/voice-ai/).

In the Vercel **certiio-sim-demo** project's Production environment, set:

```dotenv
LIVEKIT_URL=wss://YOUR-PROJECT.livekit.cloud
LIVEKIT_API_KEY=YOUR-KEY
LIVEKIT_API_SECRET=YOUR-SECRET
LIVEKIT_AGENT_NAME=certiio-northstar-customer
```

Keep the existing `AGENT_CALLBACK_SECRET`. Redeploy the app after adding the values. Never put API secrets in `NEXT_PUBLIC_` variables.

## 2. Configure the included agent

The ready-to-deploy package is `agent/`. Copy `agent/.env.example` to `agent/.env.local`, then fill:

```dotenv
LIVEKIT_URL=wss://YOUR-PROJECT.livekit.cloud
LIVEKIT_API_KEY=YOUR-KEY
LIVEKIT_API_SECRET=YOUR-SECRET
LIVEKIT_AGENT_NAME=certiio-northstar-customer
APP_URL=https://YOUR-DEPLOYED-DEMO.vercel.app
AGENT_CALLBACK_SECRET=SAME-SECRET-AS-VERCEL
```

`APP_URL` must exactly match the application's canonical production origin. The authenticated callback endpoints are:

- `POST {APP_URL}/api/agent/transcript`
- `GET {APP_URL}/api/agent/state?invitationId={id}`

The agent automatically sends `Authorization: Bearer {AGENT_CALLBACK_SECRET}`. No webhook registration is needed. The app dispatches the named agent with the invitation ID when the candidate joins their room. It grants the browser access only to that room; API secrets never reach the browser.

The included model defaults follow LiveKit's current pipeline example:

```dotenv
STT_MODEL=assemblyai/universal-3-6-pro
LLM_MODEL=google/gemma-4-31b-it
TTS_MODEL=fishaudio/s2.1-pro
TTS_VOICE=fa4c9eb3dccc4806b382b40d61c6b10a
```

These can be changed to supported LiveKit Inference models in the agent environment without changing the frontend. See [models](https://docs.livekit.io/agents/models/).

## 3. Deploy the agent

Install the [LiveKit CLI](https://docs.livekit.io/deploy/agents/quickstart/), authenticate, and select this project's credentials:

```sh
brew install livekit-cli
lk cloud auth
lk project list
lk project set-default "YOUR-PROJECT-NAME"
cd agent
lk agent create --secrets-file .env.local
lk agent status
lk agent logs
```

LiveKit Cloud injects its own project credentials into the agent; the CLI skips `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` when importing the secrets file. Those values in `.env.local` support local development.

The included Dockerfile uses Python 3.12 and pinned LiveKit Agents. The CLI creates `livekit.toml` with the assigned agent ID. The dispatch name is defined by `LIVEKIT_AGENT_NAME`, not the deployment ID. Both app and agent must use `certiio-northstar-customer`.

For updates, use `lk agent deploy`. Update secrets through the Cloud dashboard or `lk agent update-secrets --secrets-file .env.local`, then verify the running deployment. See [secret management](https://docs.livekit.io/deploy/agents/secrets/).

For local agent development instead of cloud deployment:

```sh
cd agent
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python main.py dev
```

The agent's `APP_URL` must be reachable from wherever the process runs. A local process can call localhost; a Cloud agent cannot. Cloud deployment should target the deployed HTTPS app.

## 4. Verify one real attempt

1. Log in to the employer app, send an invitation to yourself, and open the email's link.
2. Open Customer Roleplay, read the brief, grant camera/mic permission, check the camera preview, then connect.
3. Wait for the customer agent to connect. Start the 15-minute conversation. Confirm audible responses, candidate and customer captions, mute controls, and reconnect behavior. Reload once and confirm the deadline did not reset.
4. Ask about tenant boundaries, stale docs, account actions, measurable success, and pilot constraints. The customer should reveal details when prompted rather than coach a complete solution.
5. Submit. The browser asks the agent to flush the final transcript and waits for durable callback acknowledgement before submitting. Open Solution Design and verify both speakers' transcript appears immediately.
6. Draw an architecture, add notes, refresh to check restoration, then submit. Open Delivery and verify the drawing snapshot and transcript are present.
7. Upload a valid ZIP, add all three notes, and submit. Confirm all three stages are Submitted and the employer Results tab shows the real attempt as ungraded.

If the customer does not join, check the agent's dispatch name, status, project credentials, capacity, and callback authentication. If a transcript save fails, submission remains blocked and can be retried. Deadline expiry preserves the last acknowledged transcript; conversation after expiry is not accepted. The agent stops when the stage ends.

Live two-way audio, permission prompts, and provider connectivity remain unverified until these project credentials are configured.
