import type { DeviceProtocol, ProvisioningProvider } from "@prisma/client";
import { completeAdoption, onboardingAccess, prepareOnboardingForRegistration } from "@/lib/onboarding";
import { errorResponse } from "@/lib/errors";
import { gatewayProvider, TestDeviceProvider, TestGatewayProvider, tuyaProvider, webBluetoothProvider, type AdoptedDevice } from "@/lib/provisioning";
import { requireUser } from "@/lib/session";
import { completeOnboardingSchema } from "@/lib/validation";

function testDevice(protocol: DeviceProtocol, externalId: string): AdoptedDevice {
  return { externalId, name: `Test ${protocol} Device`, protocol, deviceType: "SWITCH", capabilities: ["power"], state: { power: false }, manufacturer: "HomeOS Test" };
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireUser();
    const { id } = await context.params;
    const input = completeOnboardingSchema.parse(await request.json());
    let session = await onboardingAccess(actor, id, true);
    const testEnabled = process.env.NODE_ENV === "test" && process.env.HOMEOS_TEST_PROVIDERS === "enabled";
    let provider: ProvisioningProvider;
    let result;
    if (session.onboardingType === "WIFI_BLE") {
      provider = "WEB_BLUETOOTH";
      const implementation = testEnabled ? new TestDeviceProvider(provider, testDevice("WIFI", `wifi-${id}`)) : webBluetoothProvider;
      result = await implementation.finalize({ externalId: `wifi-${id}`, name: "Wi-Fi Device" });
    } else if (session.onboardingType === "TUYA") {
      provider = "TUYA";
      const implementation = testEnabled ? new TestDeviceProvider(provider, testDevice("TUYA", `tuya-${id}`)) : tuyaProvider;
      result = await implementation.finalize({ externalId: `tuya-${id}`, name: "Tuya Device" });
    } else {
      provider = "GATEWAY";
      const implementation = testEnabled ? new TestGatewayProvider(testDevice("ZIGBEE", `zigbee-${id}`)) : gatewayProvider;
      result = await implementation.adoptDevice({ externalId: `zigbee-${id}`, name: "Zigbee Device" });
    }
    if (result.status === "SUCCESS") {
      const status = await prepareOnboardingForRegistration(id, session.status);
      session = { ...session, status };
    }
    return Response.json(await completeAdoption(actor, id, result, provider, input));
  } catch (error) { return errorResponse(error); }
}
