import test from "node:test";
import assert from "node:assert/strict";
import { AgentDispatchClient, RoomServiceClient } from "livekit-server-sdk";
import { AgentDispatch, JobStatus, Room } from "@livekit/protocol";
import { createRoomToken } from "../src/server/livekit";

const customer = "certiio-northstar-customer";
const unnamed = new AgentDispatch({ agentName: "", state: { jobs: [] } });
const named = (agentName: string, status?: JobStatus) =>
  new AgentDispatch({
    agentName,
    state: { jobs: status === undefined ? [] : [{ state: { status } }] },
  });

for (const scenario of [
  { name: "unnamed automatic dispatch cannot suppress the customer", dispatches: [unnamed], creates: 1 },
  { name: "another running agent cannot suppress the customer", dispatches: [named("another-agent", JobStatus.JS_RUNNING)], creates: 1 },
  { name: "a finished customer can be dispatched again despite an unnamed dispatch", dispatches: [unnamed, named(customer, JobStatus.JS_SUCCESS)], creates: 1 },
  { name: "a pending customer is not duplicated", dispatches: [unnamed, named(customer)], creates: 0 },
  { name: "a running customer is not duplicated", dispatches: [unnamed, named(customer, JobStatus.JS_RUNNING)], creates: 0 },
]) {
  test(scenario.name, async (t) => {
    const values = {
      LIVEKIT_URL: "wss://test.livekit.cloud",
      LIVEKIT_API_KEY: "test-key",
      LIVEKIT_API_SECRET: "test-secret",
      LIVEKIT_AGENT_NAME: customer,
      AGENT_CALLBACK_SECRET: "test-callback",
    };
    const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
    Object.assign(process.env, values);
    t.after(() => {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    });
    t.mock.method(RoomServiceClient.prototype, "createRoom", async () => new Room());
    t.mock.method(AgentDispatchClient.prototype, "listDispatch", async () => scenario.dispatches);
    const dispatch = t.mock.method(AgentDispatchClient.prototype, "createDispatch", async () => new AgentDispatch());
    const result = await createRoomToken("candidate-test", "Test Candidate");
    assert.ok(result.token);
    assert.equal(dispatch.mock.callCount(), scenario.creates);
    if (scenario.creates) {
      const [room, name, options] = dispatch.mock.calls[0].arguments;
      assert.equal(room, "certiio-candidate-test");
      assert.equal(name, customer);
      assert.equal(JSON.parse(options!.metadata!).invitationId, "candidate-test");
    }
  });
}
