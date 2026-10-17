/**
 * CCTV-01: vendor-neutral camera capability contract.
 *
 * This file defines metadata only. It does NOT establish connections, fetch
 * credentials, proxy streams, or claim a camera is playable in the browser.
 * All connection authorization must be enforced by server-side home access
 * checks in later stages.
 */
export const CAMERA_BRANDS = [
  "HIKVISION",
  "CP_PLUS",
  "DAHUA",
  "TAPO",
  "EZVIZ",
  "REOLINK",
  "GENERIC_ONVIF",
  "OTHER",
] as const;

export type CameraBrand = (typeof CAMERA_BRANDS)[number];

export const CAMERA_SOURCE_KINDS = [
  "IP_CAMERA",
  "NVR_CHANNEL",
  "DVR_CHANNEL",
] as const;
export type CameraSourceKind = (typeof CAMERA_SOURCE_KINDS)[number];

export const CAMERA_CONNECTION_METHODS = [
  "ONVIF_RTSP",
  "RTSP",
  "VENDOR_API",
  "UNSUPPORTED",
] as const;
export type CameraConnectionMethod =
  (typeof CAMERA_CONNECTION_METHODS)[number];

export type CameraCapabilities = Readonly<{
  live: boolean;
  recordings: boolean;
  ptz: boolean;
  audio: boolean;
  snapshots: boolean;
}>;

export type CameraMetadata = Readonly<{
  id: string;
  homeId: string;
  roomId: string | null;
  displayName: string;
  brand: CameraBrand;
  model: string | null;
  sourceKind: CameraSourceKind;
  connectionMethod: CameraConnectionMethod;
  capabilities: CameraCapabilities;
}>;

/**
 * The browser must never receive RTSP URLs, camera passwords, ONVIF
 * credentials, vendor tokens, or unredacted connection configuration.
 */
export type BrowserCamera = CameraMetadata & Readonly<{
  connectionStatus: "UNKNOWN" | "ONLINE" | "OFFLINE";
}>;

export function supportsBrowserLiveView(camera: BrowserCamera): boolean {
  return (
    camera.capabilities.live &&
    camera.connectionStatus === "ONLINE" &&
    camera.connectionMethod !== "UNSUPPORTED"
  );
}
