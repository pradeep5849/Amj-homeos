import { aggregateEnergy } from "./lib/telemetry";
aggregateEnergy().then((rows) => console.log(`Aggregated ${rows.length} device(s)`)).finally(async () => (await import("./lib/db")).prisma.$disconnect());
