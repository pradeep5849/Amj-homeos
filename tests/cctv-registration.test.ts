import { describe, expect, it } from "vitest";
import { cameraRegistrationSchema, toPublicCamera } from "../lib/cctv/registration";

const homeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const recorderId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const valid = {
  homeId, name: "Front Gate", brand: "HIKVISION" as const,
  sourceKind: "IP_CAMERA" as const,
  capabilities: { live: true, recordings: false, ptz: false, audio: false, snapshots: true },
};

describe("CCTV registration input boundary", () => {
  it("accepts standalone metadata", () => {
    expect(cameraRegistrationSchema.safeParse(valid).success).toBe(true);
  });
  it("requires recorder identity and positive channel for NVR/DVR", () => {
    expect(cameraRegistrationSchema.safeParse({ ...valid, sourceKind: "NVR_CHANNEL" }).success).toBe(false);
    expect(cameraRegistrationSchema.safeParse({ ...valid, sourceKind: "DVR_CHANNEL", recorderId, recorderChannel: 0 }).success).toBe(false);
    expect(cameraRegistrationSchema.safeParse({ ...valid, sourceKind: "NVR_CHANNEL", recorderId, recorderChannel: 1 }).success).toBe(true);
  });
  it("rejects recorder details on standalone camera", () => {
    expect(cameraRegistrationSchema.safeParse({ ...valid, recorderId, recorderChannel: 1 }).success).toBe(false);
  });
  it("rejects injected passwords, URLs and connection secrets", () => {
    for (const extra of [{ password: "secret" }, { rtspUrl: "rtsp://x" }, { secretRef: "vault/1" }, { host: "127.0.0.1" }]) {
      expect(cameraRegistrationSchema.safeParse({ ...valid, ...extra }).success).toBe(false);
    }
  });
  it("never includes internal secret references in public output", () => {
    const internalCamera = {
      ...valid, id: recorderId, roomId: null, recorderId: null, recorderChannel: null,
      model: null, connectionMethod: "UNSUPPORTED", connectionStatus: "UNKNOWN",
      isArchived: false, secretRef: "sensitive" ,
    };
    const result = toPublicCamera(internalCamera);
    expect(JSON.stringify(result)).not.toContain("sensitive");
    expect(result).not.toHaveProperty("secretRef");
  });
});
