import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { registerSchema } from "@/lib/validation";
import { handle, parseBody } from "@/lib/apiHelpers";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handle(async () => {
    const { name, email, password } = await parseBody(req, registerSchema);
    const normalizedEmail = email.toLowerCase();

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);
    if (existing) {
      // Deliberately vague: this endpoint shouldn't be usable to enumerate
      // which email addresses have accounts.
      return NextResponse.json(
        { error: "That email can't be registered. Try signing in instead." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db
      .insert(users)
      .values({ name, email: normalizedEmail, passwordHash })
      .returning({ id: users.id, email: users.email, name: users.name });

    return NextResponse.json({ user }, { status: 201 });
  });
}
