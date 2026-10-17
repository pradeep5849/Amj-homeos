// Transport-independent request validation for NVR recording search.
// No device calls are made until a model-specific adapter is validated.
const CAMERA = /^camera\.[a-z0-9_]+$/;
const MAX_WINDOW_MS = 24 * 60 * 60 * 1000;
export function parseRecordingSearch(value, allowlist, now = Date.now()) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).sort().join(",") !== "end,entityId,start" ||
      typeof value.entityId !== "string" || !CAMERA.test(value.entityId) ||
      !(allowlist instanceof Set) || !allowlist.has(value.entityId) ||
      typeof value.start !== "string" || typeof value.end !== "string" ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value.start) ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value.end))
    return null;
  const start = Date.parse(value.start);
  const end = Date.parse(value.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) ||
      start >= end || end - start > MAX_WINDOW_MS || end > now + 60_000 ||
      start < now - 366 * MAX_WINDOW_MS) return null;
  return { entityId: value.entityId, start: new Date(start).toISOString(), end: new Date(end).toISOString() };
}
