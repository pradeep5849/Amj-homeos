/**
 * Fail-closed parser for a single ONVIF GetDeviceInformation SOAP response.
 * This is intentionally not a general XML parser: no DTD, entities or nested
 * markup are accepted in device-information values.
 */
export type OnvifDeviceInformation = {
  manufacturer: string;
  model: string;
  firmwareVersion: string;
  serialNumber: string;
  hardwareId: string;
};

const fields = ["Manufacturer", "Model", "FirmwareVersion", "SerialNumber", "HardwareId"] as const;

export function parseOnvifDeviceInformation(xml: string): OnvifDeviceInformation {
  if (xml.length > 65536 || /<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(xml)) {
    throw new Error("Unsupported ONVIF XML");
  }
  if (!/<(?:[A-Za-z][\w.-]*:)?Envelope\b/.test(xml) ||
      !/<(?:[A-Za-z][\w.-]*:)?GetDeviceInformationResponse\b/.test(xml) ||
      /<(?:[A-Za-z][\w.-]*:)?Fault\b/.test(xml)) {
    throw new Error("Invalid ONVIF device response");
  }
  const values: string[] = [];
  for (const field of fields) {
    const match = new RegExp("<(?:[A-Za-z][\\w.-]*:)?" + field +
      ">([^<>]{0,512})<\\/(?:[A-Za-z][\\w.-]*:)?" + field + ">").exec(xml);
    if (!match) throw new Error("Missing ONVIF field: " + field);
    values.push(match[1].trim());
  }
  return {
    manufacturer: values[0], model: values[1], firmwareVersion: values[2],
    serialNumber: values[3], hardwareId: values[4],
  };
}
