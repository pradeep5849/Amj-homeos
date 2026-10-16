import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  initialActivationState, validateActivationState, transitionActivationState,
  loadActivationState, saveActivationState,
} from "../deploy/local-hub/activation-state.mjs";

test("new gateways begin unclaimed and cannot skip pending activation", () => {
  const initial = initialActivationState();
  assert.deepEqual(initial, { version: 1, status: "unclaimed", revision: 0 });
  assert.throws(() => transitionActivationState(initial, "active"));
  const pending = transitionActivationState(initial, "activation_pending");
  assert.equal(pending.revision, 1);
  const active = transitionActivationState(pending, "active");
  assert.equal(active.status, "active");
  assert.throws(() => transitionActivationState(active, "unclaimed"));
});

test("invalid or unexpected activation state is rejected", () => {
  for (const state of [null, {}, { version: 1, status: "active", revision: -1 },
    { version: 1, status: "active", revision: 0, secret: "no" }]) {
    assert.throws(() => validateActivationState(state));
  }
});

test("state persists across reads; corrupt state fails closed", async () => {
  const dir = await mkdtemp(join(tmpdir(), "amj-activation-"));
  const path = join(dir, "private", "activation.json");
  try {
    assert.deepEqual(await loadActivationState(path), initialActivationState());
    const pending = transitionActivationState(initialActivationState(), "activation_pending");
    await saveActivationState(path, pending);
    assert.deepEqual(await loadActivationState(path), pending);
    await writeFile(path, "{broken");
    await assert.rejects(loadActivationState(path));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
