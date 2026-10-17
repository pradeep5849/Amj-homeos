/**
 * Vendor-neutral CCTV capabilities. These declarations do not imply that
 * device discovery, streaming or control have been implemented.
 */
export const CCTV_ADAPTERS = {
  HIKVISION: { protocols: ["ONVIF", "RTSP"], mode: "PROBE_REQUIRED" },
  CP_PLUS: { protocols: ["ONVIF", "RTSP"], mode: "PROBE_REQUIRED" },
  DAHUA: { protocols: ["ONVIF", "RTSP"], mode: "PROBE_REQUIRED" },
  TAPO: { protocols: ["RTSP"], mode: "PROBE_REQUIRED" },
  EZVIZ: { protocols: [], mode: "UNSUPPORTED" },
  REOLINK: { protocols: ["ONVIF", "RTSP"], mode: "PROBE_REQUIRED" },
  GENERIC_ONVIF: { protocols: ["ONVIF"], mode: "PROBE_REQUIRED" },
  OTHER: { protocols: [], mode: "UNSUPPORTED" },
} as const;

export type CctvAdapterBrand = keyof typeof CCTV_ADAPTERS;
export type CctvVerifiedCapabilities = {
  live: boolean;
  recordings: boolean;
  ptz: boolean;
  audio: boolean;
  snapshots: boolean;
};

export interface CctvAdapter {
  readonly brand: CctvAdapterBrand;
  probe(device: CctvDeviceTarget, signal: AbortSignal): Promise<CctvVerifiedCapabilities>;
}

export type CctvDeviceTarget = {
  homeId: string;
  cameraId: string;
  gatewayId: string;
  /** Server-side opaque reference only. Never expose in public API responses. */
  secretRef: string;
};

/** All capability flags start false until an authorized gateway verifies them. */
export function unverifiedCapabilities(): CctvVerifiedCapabilities {
  return { live: false, recordings: false, ptz: false, audio: false, snapshots: false };
}
