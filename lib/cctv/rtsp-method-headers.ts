/** Build method-specific RTSP headers without dropping negotiated transport or session. */
export function rtspMethodHeaders(method: "DESCRIBE" | "SETUP" | "PLAY" | "TEARDOWN", sessionId?: string): string {
  if (sessionId !== undefined && !/^[A-Za-z0-9_.-]{1,128}$/.test(sessionId)) {
    throw new Error("Invalid RTSP session identifier");
  }
  if ((method === "PLAY" || method === "TEARDOWN") && !sessionId) {
    throw new Error("RTSP session identifier required");
  }
  const session = sessionId ? "Session: " + sessionId + "\r\n" : "";
  switch (method) {
    case "DESCRIBE": return "Accept: application/sdp\r\n";
    case "SETUP": return "Transport: RTP/AVP/TCP;unicast;interleaved=0-1\r\n";
    case "PLAY": return session + "Range: npt=0.000-\r\n";
    case "TEARDOWN": return session;
  }
}
