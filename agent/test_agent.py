import asyncio
import unittest
import httpx
from livekit.agents import llm
from main import TranscriptOutbox

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
            self.assertEqual(len(received), 1)
            self.assertEqual(outbox.pending, {})

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
