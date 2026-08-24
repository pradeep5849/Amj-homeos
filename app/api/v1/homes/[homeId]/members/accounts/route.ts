import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/errors";
import { homeAccess } from "@/lib/homes";
import { requireUser } from "@/lib/session";
import { createHomeUserSchema, normalizeEmail } from "@/lib/validation";

export async function POST(request: Request, context: { params: Promise<{ homeId: string }> }) {
  try {
    const actor = await requireUser();
    const { homeId } = await context.params;
    await homeAccess(actor, homeId, true);
    if (actor.role === "ADMIN") throw new HttpError(403, "Only a Home Owner or Super Admin can create members");
    const input = createHomeUserSchema.parse(await request.json());
    const passwordHash = await bcrypt.hash(input.password, 12);
    const membership = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { email: input.email.trim(), normalizedEmail: normalizeEmail(input.email), passwordHash, name: input.name.trim(), role: "HOME_USER" }, select: { id: true, email: true, name: true, role: true, isActive: true } });
      return tx.homeMembership.create({ data: { homeId, userId: user.id, role: "MEMBER" }, select: { id: true, role: true, user: { select: { id: true, email: true, name: true, role: true, isActive: true } } } });
    });
    return Response.json({ membership }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
