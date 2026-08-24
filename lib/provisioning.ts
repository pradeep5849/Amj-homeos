export type ProviderResult = { status: "NOT_CONFIGURED"; code: string };
export interface DeviceProvisioningProvider { discover(): Promise<ProviderResult>; beginProvisioning(): Promise<ProviderResult>; getStatus(): Promise<ProviderResult>; cancel(): Promise<ProviderResult>; }
export interface GatewayPairingProvider { startPairing(): Promise<ProviderResult>; stopPairing(): Promise<ProviderResult>; getPairingStatus(): Promise<ProviderResult>; }
class UnconfiguredProvider implements DeviceProvisioningProvider { constructor(private code: string) {} async discover() { return { status: "NOT_CONFIGURED", code: this.code } as const; } async beginProvisioning() { return this.discover(); } async getStatus() { return this.discover(); } async cancel() { return this.discover(); } }
export const webBluetoothProvider = new UnconfiguredProvider("REQUIRES_DEVICE_SPEC");
export const tuyaProvider = new UnconfiguredProvider("TUYA_PROVIDER_NOT_CONFIGURED");
export const gatewayProvider: GatewayPairingProvider = { async startPairing() { return { status: "NOT_CONFIGURED", code: "GATEWAY_PROVIDER_NOT_CONFIGURED" }; }, async stopPairing() { return this.startPairing(); }, async getPairingStatus() { return this.startPairing(); } };
