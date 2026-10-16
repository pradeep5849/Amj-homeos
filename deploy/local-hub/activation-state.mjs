import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import { dirname } from "node:path";

const VERSION = 1;
const VALID_STATES = new Set(["unclaimed", "activation_pending", "active", "suspended"]);
const TRANSITIONS = Object.freeze({
  unclaimed: new Set(["activation_pending"]),
  activation_pending: new Set(["unclaimed", "active"]),
  active: new Set(["suspended"]),
  suspended: new Set(["active"]),
});

export function initialActivationState() {
  return { version: VERSION, status: "unclaimed", revision: 0 };
}

export function validateActivationState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      value.version !== VERSION || !VALID_STATES.has(value.status) ||
      !Number.isSafeInteger(value.revision) || value.revision < 0 ||
      Object.keys(value).some(key => !["version", "status", "revision"].includes(key))) {
    throw new Error("Invalid gateway activation state");
  }
  return { version: VERSION, status: value.status, revision: value.revision };
}

export function transitionActivationState(current, nextStatus) {
  const state = validateActivationState(current);
  if (!TRANSITIONS[state.status].has(nextStatus)) {
    throw new Error("Activation transition not permitted");
  }
  if (state.revision === Number.MAX_SAFE_INTEGER) throw new Error("Revision exhausted");
  return { ...state, status: nextStatus, revision: state.revision + 1 };
}

// File operations are intended for a single-writer gateway service on a private
// local volume. Never place authentication credentials or ownership proofs here.
export async function loadActivationState(path) {
  try {
    return validateActivationState(JSON.parse(await readFile(path, "utf8")));
  } catch (error) {
    if (error?.code === "ENOENT") return initialActivationState();
    // Corrupt state must fail closed, not silently reset a claimed gateway.
    throw error;
  }
}

export async function saveActivationState(path, state) {
  const safe = validateActivationState(state);
  const directory = dirname(path);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const temp = path + "." + randomUUID() + ".tmp";
  let handle;
  try {
    handle = await open(temp, "wx", 0o600);
    await handle.writeFile(JSON.stringify(safe) + "\n", "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temp, path);
    // Persist directory metadata where supported.
    try {
      const dir = await open(directory, "r");
      try { await dir.sync(); } finally { await dir.close(); }
    } catch (error) {
      if (!["EINVAL", "ENOTSUP", "EISDIR", "EPERM"].includes(error?.code)) throw error;
    }
  } finally {
    if (handle) await handle.close();
    await rm(temp, { force: true });
  }
}
