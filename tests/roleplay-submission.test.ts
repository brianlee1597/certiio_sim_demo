import test from "node:test";
import assert from "node:assert/strict";
import { Room } from "livekit-client";
import type { DataPacket } from "@livekit/protocol";
import { flushRoleplayTranscript, submitRoleplay } from "../src/lib/roleplay-submission";

test("browser final save tolerates a response longer than 15 milliseconds", async () => {
  const room = new Room();
  // Keep the installed browser SDK's real RPC deadline handling. Replace only
  // its network transport with an acknowledged, delayed customer response.
  const manager = (room as unknown as { rpcClientManager: {
    removeAllListeners: (event: string) => void;
    on: (event: string, listener: (event: { packet: DataPacket }) => void) => void;
    handleIncomingRpcAck: (id: string) => void;
    handleIncomingRpcResponseSuccess: (id: string, payload: string) => void;
  } }).rpcClientManager;
  manager.removeAllListeners("sendDataPacket");
  manager.on("sendDataPacket", ({ packet }) => {
    assert.equal(packet.value.case, "rpcRequest");
    if (packet.value.case !== "rpcRequest") return;
    const request = packet.value.value;
    assert.equal(request.method, "flush_transcript");
    assert.ok(request.responseTimeoutMs > 12_000, "Agent needs its full final-save budget plus network headroom");
    manager.handleIncomingRpcAck(request.id);
    setTimeout(() => manager.handleIncomingRpcResponseSuccess(request.id, '{"saved":true}'), 50);
  });
  await flushRoleplayTranscript(room.localParticipant, "customer");
});

test("an unconfirmed transcript save cannot submit an active roleplay", async () => {
  let submitted = false;
  await assert.rejects(submitRoleplay({
    status: async () => "active",
    flush: () => flushRoleplayTranscript({ performRpc: async () => '{"saved":false}' }, "customer"),
    submit: async () => { submitted = true; },
  }), /could not confirm/);
  assert.equal(submitted, false);
});

test("a finalized attempt needs no live agent or duplicate submission", async () => {
  await submitRoleplay({
    status: async () => "submitted",
    flush: async () => { assert.fail("Already submitted attempt contacted the agent"); },
    submit: async () => { assert.fail("Already submitted attempt was submitted again"); },
  });
});

test("deadline or lost response during submission recovers from server state", async () => {
  for (const failsAt of ["flush", "submit"]) {
    let reads = 0;
    await submitRoleplay({
      status: async () => ++reads === 1 ? "active" : "submitted",
      flush: async () => { if (failsAt === "flush") throw new Error("Recipient disconnected"); },
      submit: async () => { throw new Error("Connection lost after saving"); },
    });
    assert.equal(reads, 2);
  }
});

test("an active attempt only submits after durable transcript confirmation", async () => {
  const actions: string[] = [];
  await submitRoleplay({
    status: async () => "active",
    flush: async () => { actions.push("saved"); },
    submit: async () => { actions.push("submitted"); },
  });
  assert.deepEqual(actions, ["saved", "submitted"]);
});
