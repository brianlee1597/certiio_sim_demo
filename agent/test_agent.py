import asyncio
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock
import httpx
from livekit.agents import llm
from main import TranscriptOutbox, finalize_transcript

class TranscriptTests(unittest.IsolatedAsyncioTestCase):
    async def test_final_messages_are_deduplicated_and_saved(self):
        received = []
        async def handler(request):
            received.append(request)
            return httpx.Response(200, json={'saved': True})
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            outbox = TranscriptOutbox(client, 'https://demo.example', 'invitation')
            item = llm.ChatMessage(role='user', content=['A focused pilot.'])
            outbox.add(item)
            outbox.add(item)
            await outbox.flush()
            # Submitting re-adds session history; acknowledged turns must not
            # cause one network request per old turn and exhaust the RPC budget.
            outbox.add(item)
            await outbox.flush()
            self.assertEqual(len(received), 1)
            self.assertEqual(outbox.pending, {})

    async def test_finalize_saves_last_turn_before_acknowledging(self):
        item = llm.ChatMessage(role='user', content=['The final pilot scope.'])
        session = SimpleNamespace(input=SimpleNamespace(set_audio_enabled=Mock()),
                                  interrupt=AsyncMock(), commit_user_turn=AsyncMock(),
                                  history=SimpleNamespace(items=[]))
        async def finish_turn():
            session.history.items.append(item)
        session.wait_for_idle = AsyncMock(side_effect=finish_turn)
        outbox = SimpleNamespace(add=Mock(), flush=AsyncMock())
        await finalize_transcript(session, outbox)
        session.interrupt.assert_awaited_once_with(force=True)
        session.commit_user_turn.assert_awaited_once()
        outbox.add.assert_called_once_with(item)
        outbox.flush.assert_awaited_once()
        session.input.set_audio_enabled.assert_called_once_with(False)

    async def test_entire_finalize_is_bounded_and_restores_input_on_retry(self):
        for stalled_step in ('interrupt', 'commit_user_turn', 'wait_for_idle', 'flush'):
            with self.subTest(stalled_step=stalled_step):
                async def stall(*args, **kwargs):
                    await asyncio.Event().wait()
                session = SimpleNamespace(input=SimpleNamespace(set_audio_enabled=Mock()),
                                          interrupt=AsyncMock(), commit_user_turn=AsyncMock(),
                                          wait_for_idle=AsyncMock(),
                                          history=SimpleNamespace(items=[]))
                outbox = SimpleNamespace(add=Mock(), flush=AsyncMock())
                target = outbox if stalled_step == 'flush' else session
                setattr(target, stalled_step, AsyncMock(side_effect=stall))
                with self.assertRaises(TimeoutError):
                    await finalize_transcript(session, outbox, timeout=0.02)
                self.assertEqual(session.input.set_audio_enabled.call_args.args, (True,))

    async def test_rpc_cancellation_restores_input(self):
        started = asyncio.Event()
        async def stall(*args, **kwargs):
            started.set()
            await asyncio.Event().wait()
        session = SimpleNamespace(input=SimpleNamespace(set_audio_enabled=Mock()),
                                  interrupt=AsyncMock(side_effect=stall), commit_user_turn=AsyncMock(),
                                  wait_for_idle=AsyncMock(),
                                  history=SimpleNamespace(items=[]))
        outbox = SimpleNamespace(add=Mock(), flush=AsyncMock())
        saving = asyncio.create_task(finalize_transcript(session, outbox))
        await started.wait()
        saving.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await saving
        self.assertEqual(session.input.set_audio_enabled.call_args.args, (True,))

    async def test_failed_persistence_remains_pending_and_blocks_flush(self):
        async def handler(request):
            return httpx.Response(503)
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            outbox = TranscriptOutbox(client, 'https://demo.example', 'invitation')
            outbox.add(llm.ChatMessage(role='assistant', content=['What will this improve?']))
            with self.assertRaises(RuntimeError):
                await outbox.flush()
            self.assertEqual(len(outbox.pending), 1)

    async def test_frozen_evidence_is_not_rewritten(self):
        async def handler(request):
            return httpx.Response(409)
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            outbox = TranscriptOutbox(client, 'https://demo.example', 'invitation')
            outbox.add(llm.ChatMessage(role='user', content=['Late turn']))
            await outbox.flush()
            self.assertEqual(outbox.pending, {})

if __name__ == '__main__':
    unittest.main()
