import { Socket } from "node:net";
import { parseLocalCameraEndpoint, type LocalCameraEndpoint } from "./local-camera-endpoint";

export type CameraPortProbe = {
  onvifTcpReachable: boolean;
  rtspTcpReachable: boolean;
  /** TCP reachability does not establish ONVIF or RTSP protocol support. */
  protocolVerified: false;
};

export function probeTcpPort(host: string, port: number, timeoutMs = 2000): Promise<boolean> {
  return new Promise(resolve => {
    const socket = new Socket();
    let settled = false;
    const finish = (reachable: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(reachable);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.once("timeout", () => finish(false));
    socket.connect(port, host);
  });
}

/** Run only in the trusted local gateway agent, never in cloud request handlers. */
export async function probeLocalCameraPorts(input: LocalCameraEndpoint): Promise<CameraPortProbe> {
  const endpoint = parseLocalCameraEndpoint(input);
  const [onvifTcpReachable, rtspTcpReachable] = await Promise.all([
    probeTcpPort(endpoint.host, endpoint.onvifPort),
    probeTcpPort(endpoint.host, endpoint.rtspPort),
  ]);
  return { onvifTcpReachable, rtspTcpReachable, protocolVerified: false };
}
