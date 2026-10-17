import { z } from "zod";

/**
 * CCTV-02b: metadata-only camera registration input.
 * Credentials, hostnames, IPs, URLs, and arbitrary connection configuration
 * are intentionally excluded until an authenticated local gateway and
 * encrypted secret store are available.
 */
export const cameraRegistrationSchema = z.object({
  homeId: z.uuid(),
  roomId: z.uuid().nullable().optional(),
  recorderId: z.uuid().nullable().optional(),
  recorderChannel: z.number().int().positive().max(4096).nullable().optional(),
  name: z.string().trim().min(1).max(120),
  brand: z.enum(["HIKVISION","CP_PLUS","DAHUA","TAPO","EZVIZ","REOLINK","GENERIC_ONVIF","OTHER"]),
  model: z.string().trim().max(120).nullable().optional(),
  sourceKind: z.enum(["IP_CAMERA","NVR_CHANNEL","DVR_CHANNEL"]),
  connectionMethod: z.enum(["ONVIF_RTSP","RTSP","VENDOR_API","UNSUPPORTED"]).default("UNSUPPORTED"),
  capabilities: z.object({
    live: z.boolean(),
    recordings: z.boolean(),
    ptz: z.boolean(),
    audio: z.boolean(),
    snapshots: z.boolean(),
  }).strict(),
}).strict().superRefine((value, ctx) => {
  const standalone = value.sourceKind === "IP_CAMERA";
  const hasRecorder = value.recorderId != null;
  const hasChannel = value.recorderChannel != null;
  if (standalone && (hasRecorder || hasChannel)) {
    ctx.addIssue({code:"custom",path:["recorderId"],message:"Standalone IP cameras cannot have a recorder channel"});
  }
  if (!standalone && (!hasRecorder || !hasChannel)) {
    ctx.addIssue({code:"custom",path:["recorderId"],message:"Recorder channels require recorderId and recorderChannel"});
  }
});

export type CameraRegistrationInput = z.infer<typeof cameraRegistrationSchema>;

/** Whitelist output fields. Never serialize Prisma camera records directly. */
export function toPublicCamera(camera: {
  id: string; homeId: string; roomId: string | null; recorderId: string | null;
  recorderChannel: number | null; name: string; brand: string; model: string | null;
  sourceKind: string; connectionMethod: string; connectionStatus: string;
  capabilities: unknown; isArchived: boolean;
}) {
  return {
    id: camera.id,
    homeId: camera.homeId,
    roomId: camera.roomId,
    recorderId: camera.recorderId,
    recorderChannel: camera.recorderChannel,
    name: camera.name,
    brand: camera.brand,
    model: camera.model,
    sourceKind: camera.sourceKind,
    connectionMethod: camera.connectionMethod,
    connectionStatus: camera.connectionStatus,
    capabilities: camera.capabilities,
    isArchived: camera.isArchived,
  };
}
