import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function errorResponse(error: unknown) {
  if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) return Response.json({ error: "Invalid request", issues: error.issues }, { status: 400 });
  if (error instanceof SyntaxError) return Response.json({ error: "Invalid JSON" }, { status: 400 });
  if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return Response.json({ error: "A record with those details already exists" }, { status: 409 });
  console.error("Unhandled API error", error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
