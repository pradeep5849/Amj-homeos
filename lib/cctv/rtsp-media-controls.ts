import { parseRtspSdp } from "./rtsp-sdp";

/**
 * Extract safe media control paths for future RTSP SETUP.
 * Absolute control URLs must remain on the previously validated camera.
 */
export function rtspMediaControls(sdp: string, streamUri: string): string[] {
  const stream = new URL(streamUri);
  if (stream.protocol !== "rtsp:" || stream.username || stream.password) {
    throw new Error("Invalid RTSP stream");
  }
  const mediaCount = parseRtspSdp(sdp).length;
  const sections = sdp.split(/\r?\nm=/).slice(1);
  if (sections.length !== mediaCount) throw new Error("Invalid SDP media sections");
  return sections.map(section => {
    const controls = section.split(/\r?\n/).filter(line => line.startsWith("a=control:"));
    if (controls.length !== 1) throw new Error("Missing or ambiguous RTSP media control");
    const control = controls[0].slice("a=control:".length);
    if (!control || control.length > 512 || /[\r\n#]/.test(control) || control === "*") {
      throw new Error("Invalid RTSP media control");
    }
    const resolved = new URL(control, streamUri);
    if (resolved.protocol !== "rtsp:" || resolved.hostname !== stream.hostname ||
        resolved.port !== stream.port || resolved.username || resolved.password ||
        resolved.hash) throw new Error("Off-camera RTSP media control");
    return resolved.toString();
  });
}
