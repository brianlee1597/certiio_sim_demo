import asyncio
import json
import logging
import os
import time
from urllib.parse import urlparse

import httpx
from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import Agent, AgentServer, AgentSession, inference, llm, room_io, TurnHandlingOptions

from customer import CUSTOMER_INSTRUCTIONS

load_dotenv('.env.local')
logger = logging.getLogger('certiio-customer')
server = AgentServer()
AGENT_NAME = os.getenv('LIVEKIT_AGENT_NAME', 'certiio-northstar-customer')


class TranscriptOutbox:
    """Retry ordered final transcript writes; flush must confirm durable delivery."""
    def __init__(self, client, origin, invitation_id):
        self.client, self.origin, self.invitation_id = client, origin, invitation_id
        self.pending = {}
        self.delivered = set()
        self.lock = asyncio.Lock()

    def add(self, item):
        if not isinstance(item, llm.ChatMessage) or item.role not in ('user', 'assistant') or not item.text_content:
            return
        if item.id in self.delivered:
            return
        self.pending[item.id] = {
            'invitationId': self.invitation_id,
            'segment': {'segment_id': item.id, 'speaker': 'candidate' if item.role == 'user' else 'customer',
                        'text': item.text_content, 'occurred_at': int(item.created_at * 1000), 'final': True},
        }

    async def flush(self):
        async with self.lock:
            for key, event in list(self.pending.items()):
                for attempt in range(4):
                    try:
                        response = await self.client.post(f'{self.origin}/api/agent/transcript', json=event)
                        if response.status_code == 409:
                            # The app has frozen the evidence at the deadline or after submission.
                            del self.pending[key]
                            self.delivered.add(key)
                            break
                        response.raise_for_status()
                        del self.pending[key]
                        self.delivered.add(key)
                        break
                    except (httpx.HTTPError, OSError):
                        if attempt == 3:
                            raise RuntimeError('Transcript persistence is unavailable; retry submission.')
                        await asyncio.sleep(0.25 * 2 ** attempt)


async def finalize_transcript(session, outbox, *, timeout=12.0):
    """Bound the entire save operation below the browser's 15-second RPC limit."""
    session.input.set_audio_enabled(False)
    try:
        async with asyncio.timeout(timeout):
            await session.interrupt(force=True)
            await session.commit_user_turn(skip_reply=True, transcript_timeout=3.0, stt_flush_duration=0.5)
            # commit_user_turn triggers end-of-turn handling asynchronously.
            # Wait for the resulting history item before acknowledging its save.
            await session.wait_for_idle()
            for item in session.history.items:
                outbox.add(item)
            await outbox.flush()
    except (Exception, asyncio.CancelledError):
        session.input.set_audio_enabled(True)
        raise


@server.rtc_session(agent_name=AGENT_NAME)
async def customer_session(ctx: agents.JobContext):
    metadata = json.loads(ctx.job.metadata or '{}')
    invitation_id = metadata.get('invitationId', '')
    # Use the deployment's configured origin; never send callback credentials to metadata-provided URLs.
    origin = os.environ['APP_URL'].rstrip('/')
    if not invitation_id or (urlparse(origin).scheme != 'https' and urlparse(origin).hostname not in ('localhost', '127.0.0.1')):
        raise ValueError('Invalid application origin or invitation metadata.')
    client = httpx.AsyncClient(headers={'Authorization': f"Bearer {os.environ['AGENT_CALLBACK_SECRET']}"}, timeout=5)
    outbox = TranscriptOutbox(client, origin, invitation_id)
    await ctx.connect()
    session = None
    closing = False
    session_closed = False
    flush_lock = asyncio.Lock()
    disconnected = asyncio.Event()

    @ctx.room.on('disconnected')
    def room_disconnected(*_):
        disconnected.set()

    async def tick():
        try:
            await asyncio.wait_for(disconnected.wait(), timeout=0.7)
        except TimeoutError:
            pass

    async def state():
        response = await client.get(f'{origin}/api/agent/state', params={'invitationId': invitation_id})
        response.raise_for_status()
        return response.json()

    @ctx.room.local_participant.register_rpc_method('flush_transcript')
    async def flush_transcript(data: rtc.RpcInvocationData):
        nonlocal closing
        if data.caller_identity != f'candidate-{invitation_id}' or session is None or session_closed:
            raise rtc.RpcError(code=1500, message='The conversation is not ready.')
        if flush_lock.locked():
            raise rtc.RpcError(code=1500, message='A transcript save is already in progress. Retry shortly.')
        closing = True
        try:
            async with flush_lock:
                await finalize_transcript(session, outbox)
            return json.dumps({'saved': True})
        except asyncio.CancelledError:
            closing = False
            raise
        except Exception as error:
            closing = False
            logger.exception('Final transcript save failed')
            raise rtc.RpcError(code=1500, message='Transcript save failed. Retry submission.') from error

    try:
        # Connect first, but do not listen, speak, or start the timer before explicit candidate confirmation.
        deadline = time.monotonic() + 120
        current = await state()
        while current['status'] == 'not_started' and time.monotonic() < deadline and not disconnected.is_set():
            await tick()
            current = await state()
        if current['status'] != 'active' or disconnected.is_set():
            return
        history = llm.ChatContext()
        for segment in current.get('transcript', []):
            outbox.delivered.add(segment['segment_id'])
            history.add_message(role='user' if segment['speaker'] == 'candidate' else 'assistant', content=segment['text'],
                                id=segment['segment_id'], created_at=segment['occurred_at'] / 1000)
        session = AgentSession(
            stt=inference.STT(model=os.getenv('STT_MODEL', 'assemblyai/universal-3-6-pro'), language='en'),
            llm=inference.LLM(model=os.getenv('LLM_MODEL', 'google/gemma-4-31b-it')),
            tts=inference.TTS(model=os.getenv('TTS_MODEL', 'fishaudio/s2.1-pro'), voice=os.getenv('TTS_VOICE', 'fa4c9eb3dccc4806b382b40d61c6b10a')),
            turn_handling=TurnHandlingOptions(turn_detection=inference.TurnDetector()),
        )

        @session.on('conversation_item_added')
        def capture(event):
            outbox.add(event.item)

        @session.on('close')
        def closed(_):
            nonlocal session_closed
            session_closed = True

        await session.start(room=ctx.room, agent=Agent(instructions=CUSTOMER_INSTRUCTIONS, chat_ctx=history),
                            room_options=room_io.RoomOptions(video_input=False, close_on_disconnect=False,
                                                             participant_identity=f'candidate-{invitation_id}'))
        if current.get('transcript'):
            session.generate_reply(instructions='Briefly welcome the candidate back and continue the existing customer conversation. Do not restart discovery.')
        else:
            session.generate_reply(instructions='Open as Maya with the situation in the fixed scenario. Ask how the candidate would approach understanding the problem.')

        warned = False
        failures = 0
        while not disconnected.is_set() and not session_closed:
            await tick()
            try:
                await outbox.flush()
                current = await state()
                failures = 0
            except (httpx.HTTPError, RuntimeError):
                failures += 1
                if failures > 8:
                    raise RuntimeError('Cannot confirm the assessment deadline.')
                continue
            if current['status'] != 'active':
                break
            if not closing and not warned and current.get('deadline', 0) - time.time() * 1000 < 90000:
                warned = True
                session.generate_reply(instructions='At a natural moment, ask the candidate to summarize the pilot, success criteria, and next steps. Keep it brief.')
    finally:
        if session is not None:
            await session.aclose()
        try:
            await asyncio.wait_for(outbox.flush(), timeout=6)
        except (RuntimeError, TimeoutError):
            logger.exception('Final cleanup could not persist pending transcript')
        await client.aclose()
        ctx.shutdown(reason='Customer session ended')


if __name__ == '__main__':
    agents.cli.run_app(server)
