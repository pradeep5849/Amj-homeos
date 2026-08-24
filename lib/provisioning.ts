import type { DeviceProtocol, DeviceType, ProvisioningProvider } from "@prisma/client";

export type ProviderUnavailable = { status: "NOT_CONFIGURED"; code: string };
export type DiscoveredDevice = { externalId: string; name: string; manufacturer?: string; model?: string };
export type AdoptedDevice = DiscoveredDevice & { protocol: DeviceProtocol; deviceType: DeviceType; capabilities: string[]; state: Record<string, unknown> };
export type ProviderResult<T = never> = ProviderUnavailable | { status: "SUCCESS"; value: T };

export interface DeviceProvisioningProvider {
  readonly provider: ProvisioningProvider;
  supports(): Promise<boolean>;
  discover(): Promise<ProviderResult<DiscoveredDevice[]>>;
  beginProvisioning(device?: DiscoveredDevice): Promise<ProviderResult<void>>;
  getStatus(): Promise<ProviderResult<string>>;
  cancel(): Promise<ProviderResult<void>>;
  finalize(device?: DiscoveredDevice): Promise<ProviderResult<AdoptedDevice>>;
}

export interface GatewayPairingProvider {
  readonly provider: ProvisioningProvider;
  supports(): Promise<boolean>;
  startPairing(): Promise<ProviderResult<void>>;
  stopPairing(): Promise<ProviderResult<void>>;
  getPairingStatus(): Promise<ProviderResult<string>>;
  listDiscoveredDevices(): Promise<ProviderResult<DiscoveredDevice[]>>;
  adoptDevice(device?: DiscoveredDevice): Promise<ProviderResult<AdoptedDevice>>;
}

class UnconfiguredDeviceProvider implements DeviceProvisioningProvider {
  constructor(readonly provider: ProvisioningProvider, private readonly code: string) {}
  async supports() { return false; }
  private unavailable(): ProviderUnavailable { return { status: "NOT_CONFIGURED", code: this.code }; }
  async discover() { return this.unavailable(); }
  async beginProvisioning() { return this.unavailable(); }
  async getStatus() { return this.unavailable(); }
  async cancel() { return this.unavailable(); }
  async finalize() { return this.unavailable(); }
}

class UnconfiguredGatewayProvider implements GatewayPairingProvider {
  readonly provider = "GATEWAY" as const;
  async supports() { return false; }
  private unavailable(): ProviderUnavailable { return { status: "NOT_CONFIGURED", code: "GATEWAY_PROVIDER_NOT_CONFIGURED" }; }
  async startPairing() { return this.unavailable(); }
  async stopPairing() { return this.unavailable(); }
  async getPairingStatus() { return this.unavailable(); }
  async listDiscoveredDevices() { return this.unavailable(); }
  async adoptDevice() { return this.unavailable(); }
}

export const webBluetoothProvider: DeviceProvisioningProvider = new UnconfiguredDeviceProvider("WEB_BLUETOOTH", "REQUIRES_DEVICE_SPEC");
export const tuyaProvider: DeviceProvisioningProvider = new UnconfiguredDeviceProvider("TUYA", "TUYA_PROVIDER_NOT_CONFIGURED");
export const gatewayProvider: GatewayPairingProvider = new UnconfiguredGatewayProvider();

export function assertTestProvidersAllowed() {
  if (process.env.NODE_ENV !== "test") throw new Error("Test provisioning providers are disabled outside tests");
}

export class TestDeviceProvider implements DeviceProvisioningProvider {
  constructor(readonly provider: ProvisioningProvider, private readonly adopted: AdoptedDevice) { assertTestProvidersAllowed(); }
  async supports() { return true; }
  async discover(): Promise<ProviderResult<DiscoveredDevice[]>> { return { status: "SUCCESS", value: [this.adopted] }; }
  async beginProvisioning() { return { status: "SUCCESS", value: undefined } as const; }
  async getStatus() { return { status: "SUCCESS", value: "READY" } as const; }
  async cancel() { return { status: "SUCCESS", value: undefined } as const; }
  async finalize() { return { status: "SUCCESS", value: this.adopted } as const; }
}

export class TestGatewayProvider implements GatewayPairingProvider {
  readonly provider = "GATEWAY" as const;
  constructor(private readonly adopted: AdoptedDevice) { assertTestProvidersAllowed(); }
  async supports() { return true; }
  async startPairing() { return { status: "SUCCESS", value: undefined } as const; }
  async stopPairing() { return { status: "SUCCESS", value: undefined } as const; }
  async getPairingStatus() { return { status: "SUCCESS", value: "SEARCHING" } as const; }
  async listDiscoveredDevices(): Promise<ProviderResult<DiscoveredDevice[]>> { return { status: "SUCCESS", value: [this.adopted] }; }
  async adoptDevice() { return { status: "SUCCESS", value: this.adopted } as const; }
}
