import { prisma } from "../lib/db";

/**
 * Periodic maintenance for short-lived CCTV authentication records.
 * Run as an authenticated internal scheduled job, not a public endpoint.
 */
async function main() {
  const nonceCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const challengeCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [nonces, challenges] = await prisma.$transaction([
    prisma.cctvGatewayRequestNonce.deleteMany({ where: { createdAt: { lt: nonceCutoff } } }),
    prisma.cctvGatewayPairingChallenge.deleteMany({
      where: { OR: [{ expiresAt: { lt: challengeCutoff } }, { consumedAt: { lt: challengeCutoff } }] },
    }),
  ]);
  console.info("CCTV authentication record cleanup", {
    nonceRecordsRemoved: nonces.count,
    challengeRecordsRemoved: challenges.count,
  });
}

main().catch(() => {
  console.error("CCTV authentication record cleanup failed");
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
