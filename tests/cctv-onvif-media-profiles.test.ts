import { describe, expect, it } from "vitest";
import { onvifGetProfilesRequest, parseOnvifProfileTokens } from "../lib/cctv/onvif-media-profiles";

describe("ONVIF Media1 profiles", () => {
  it("constructs a fixed local Media1 request", () => {
    const request = onvifGetProfilesRequest({ host: "10.1.1.20", onvifPort: 80, rtspPort: 554 });
    expect(request.url).toBe("http://10.1.1.20:80/onvif/media_service");
    expect(request.body).toContain("<trt:GetProfiles/>");
  });
  it("extracts bounded profile tokens", () => {
    expect(parseOnvifProfileTokens('<s:GetProfilesResponse><trt:Profiles token="main"/><trt:Profiles token="sub"/></s:GetProfilesResponse>'))
      .toEqual(["main", "sub"]);
  });
  it("rejects malformed XML declarations", () => {
    expect(() => parseOnvifProfileTokens('<!DOCTYPE root><s:GetProfilesResponse/>')).toThrow();
  });
});
