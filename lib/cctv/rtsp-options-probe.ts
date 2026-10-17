import { Socket } from "node:net";
import { parseLocalCameraEndpoint, type LocalCameraEndpoint } from "./local-camera-endpoint";

export type RtspOptionsResult = {
  statusCode: number;
  methods: string[];
};

/**
 * Local gateway only. RTSP OPTIONS checks server protocol support without
 * requesting media or exposing credentials. No redirects or arbitrary URLs.
 */
export async function probeRtspOptions(input: LocalCameraEndpoint, timeoutMs = 2500): Promise<RtspOptionsResult> {
  const endpoint = parseLocalCameraEndpoint(input);
  const target = "rtsp://" + endpoint.host + ":" + endpoint.rtspPort + "/";
  const request = "OPTIONS " + target + " RTSP/1.0\r\nCSeq: 1\r\nUser-Agent: AMJ-HomeOS-Gateway\r\n\r\n";
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    let buffer = "";
    let finished = false;
    const finish = (error?: Error, value?: RtspOptionsResult) => {
      if (finished) return;
      finished = true;
      socket.destroy();
      if (error) reject(error);
      else resolve(value!);
    };
    socket.setTimeout(timeoutMs);
    socket.once("error", error => finish(error));
    socket.once("timeout", () => finish(new Error("RTSP probe timed out")));
    socket.once("connect", () => socket.write(request));
    socket.on("data", chunk => {
      buffer += chunk.toString("latin1");
      if (buffer.length > 8192) return finish(new Error("RTSP response too large"));
      const end = buffer.indexOf("\r\n\r\n");
      if (end < 0) return;
      const lines = buffer.slice(0, end).split("\r\n");
      const status = /^RTSP\/1\.0 ([1-5][0-9]{2})(?:\s|$)/.exec(lines[0]);
      if (!status) return finish(new Error("Invalid RTSP response"));
      const publicHeader = lines.find(line => /^Public:\s*/i.test(line));
      const methods = publicHeader ? publicHeader.slice(publicHeader.indexOf(":") + 1)
        .split(",").map(method => method.trim().toUpperCase()).filter(Boolean) : [];
      finish(undefined, { statusCode: Number(status[1]), methods });
    });
    socket.connect(endpoint.rtspPort, endpoint.host);
  });
}
