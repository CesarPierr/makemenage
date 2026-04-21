import { createSession, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirectTo, shouldUseSecureCookies } from "@/lib/request";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const formData = await request.formData();
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return redirectTo(request, "/login");
  }

  const user = await db.user.findUnique({
    where: {
      email: parsed.data.email,
    },
  });

  if (!user) {
    return redirectTo(request, "/login");
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);

  if (!valid) {
    return redirectTo(request, "/login");
  }

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createSession(user.id, { secure: shouldUseSecureCookies(request) });

  return redirectTo(request, "/app");
}
