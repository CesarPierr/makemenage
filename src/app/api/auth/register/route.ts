import { NextResponse } from "next/server";

import { createSession, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const formData = await request.formData();
  const parsed = registerSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/register", request.url));
  }

  const existing = await db.user.findUnique({
    where: {
      email: parsed.data.email,
    },
  });

  if (existing) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const user = await db.user.create({
    data: {
      email: parsed.data.email,
      displayName: parsed.data.displayName,
      passwordHash: await hashPassword(parsed.data.password),
    },
  });

  await createSession(user.id);

  return NextResponse.redirect(new URL("/app", request.url));
}
