import { evaluateStaleDevices } from "./lib/telemetry";
evaluateStaleDevices().then((count) => console.log(`Health evaluated; ${count} device(s) changed`)).finally(async () => (await import("./lib/db")).prisma.$disconnect());
