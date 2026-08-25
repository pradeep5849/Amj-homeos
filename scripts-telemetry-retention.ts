import { retainTelemetry } from "./lib/telemetry";
retainTelemetry().then((count) => console.log(`Removed ${count} expired telemetry row(s)`)).finally(async () => (await import("./lib/db")).prisma.$disconnect());
