export interface RtspOptionsResult { status: number; methods: string[] }
export function parseRtspOptionsResponse(raw: string, expectedCseq: number): RtspOptionsResult;
export function probeRtspOptions(input: {
  uri: string; sourceAddress: string; timeoutMs?: number;
  connect?: typeof import("node:net").createConnection;
}): Promise<RtspOptionsResult>;
