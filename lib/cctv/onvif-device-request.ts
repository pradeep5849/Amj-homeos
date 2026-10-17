import { parseLocalCameraEndpoint, type LocalCameraEndpoint } from "./local-camera-endpoint";

/**
 * Construct a fixed-path ONVIF device-service request for a locally configured
 * camera. Transport, credentials and SOAP response parsing are separate steps.
 * Never accept an arbitrary URL or SOAP action from a cloud API.
 */
export function onvifDeviceInformationRequest(endpoint: LocalCameraEndpoint) {
  const camera = parseLocalCameraEndpoint(endpoint);
  const url = new URL("http://" + camera.host + ":" + camera.onvifPort + "/onvif/device_service");
  const body = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" ' +
    'xmlns:tds="http://www.onvif.org/ver10/device/wsdl">' +
    '<s:Body><tds:GetDeviceInformation/></s:Body></s:Envelope>';
  return {
    url: url.toString(),
    method: "POST" as const,
    headers: {
      "content-type": "application/soap+xml; charset=utf-8",
      "accept": "application/soap+xml",
    },
    body,
  };
}
