import { describe, expect, it } from "vitest";
import { parseOnvifStreamUri } from "../lib/cctv/onvif-stream-response";

const endpoint = { host: "192.168.1.50", onvifPort: 80, rtspPort: 554 };
const wrap = (uri: string) => '<s:Envelope><s:Body><trt:GetStreamUriResponse><trt:MediaUri>' +
  '<tt:Uri>' + uri + '</tt:Uri></trt:MediaUri></trt:GetStreamUriResponse></s:Body></s:Envelope>';

describe("ONVIF stream URI parsing", () => {
  it("accepts RTSP URI for the configured local camera", () => {
    expect(parseOnvifStreamUri(wrap("rtsp://192.168.1.50:554/stream1"), endpoint))
      .toBe("rtsp://192.168.1.50:554/stream1");
  });
  it.each([
    "rtsp://192.168.1.51:554/stream",
    "rtsp://8.8.8.8:554/stream",
    "http://192.168.1.50:554/stream",
    "rtsp://user:password@192.168.1.50:554/stream",
    "rtsp://192.168.1.50:8554/stream",
  ])("rejects unexpected destination %s", uri => {
    expect(() => parseOnvifStreamUri(wrap(uri), endpoint)).toThrow();
  });
  it("rejects SOAP faults and XML entities", () => {
    expect(() => parseOnvifStreamUri('<!DOCTYPE x>' + wrap("rtsp://192.168.1.50/stream"), endpoint)).toThrow();
    expect(() => parseOnvifStreamUri(wrap("rtsp://192.168.1.50/stream").replace("</s:Body>", "<s:Fault/></s:Body>"), endpoint)).toThrow();
  });
});
