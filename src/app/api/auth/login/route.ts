import { createSession, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeNextPath, redirectTo, shouldUseSecureCookies } from "@/lib/request";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const formData = await request.formData();
  const submittedEmail = String(formData.get("email") ?? "").trim();
  const next = normalizeNextPath(formData.get("next")?.toString());
  const parsed = loginSchema.safeParse({
    email: submittedEmail,
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const params = new URLSearchParams({
      error: "invalid_credentials",
    });

    if (submittedEmail) {
      params.set("email", submittedEmail);
    }

    if (next) {
      params.set("next", next);
    }

    return redirectTo(request, `/login?${params.toString()}`);
  }

  const user = await db.user.findUnique({
    where: {
      email: parsed.data.email,
    },
  });

  if (!user) {
    const params = new URLSearchParams({
      error: "invalid_credentials",
      email: parsed.data.email,
    });

    if (next) {
      params.set("next", next);
    }

    return redirectTo(request, `/login?${params.toString()}`);
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);

  if (!valid) {
    const params = new URLSearchParams({
      error: "invalid_credentials",
      email: parsed.data.email,
    });

    if (next) {
      params.set("next", next);
    }

    return redirectTo(request, `/login?${params.toString()}`);
  }

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createSession(user.id, { secure: shouldUseSecureCookies(request) });

  return redirectTo(request, next ?? "/app");
}
