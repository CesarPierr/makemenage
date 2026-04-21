import { createSession, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirectTo, shouldUseSecureCookies } from "@/lib/request";
import { registerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const formData = await request.formData();
  const parsed = registerSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return redirectTo(request, "/register");
  }

  const existing = await db.user.findUnique({
    where: {
      email: parsed.data.email,
    },
  });

  if (existing) {
    return redirectTo(request, "/login");
  }

  const user = await db.user.create({
    data: {
      email: parsed.data.email,
      displayName: parsed.data.displayName,
      passwordHash: await hashPassword(parsed.data.password),
    },
  });

  await createSession(user.id, { secure: shouldUseSecureCookies(request) });

  return redirectTo(request, "/app");
}
