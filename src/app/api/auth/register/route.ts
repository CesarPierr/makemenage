import { hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeNextPath, redirectTo } from "@/lib/request";
import { registerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const formData = await request.formData();
  const next = normalizeNextPath(formData.get("next")?.toString());
  const parsed = registerSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const params = new URLSearchParams({
      error: "invalid_registration",
    });

    if (next) {
      params.set("next", next);
    }

    return redirectTo(request, `/register?${params.toString()}`);
  }

  const existing = await db.user.findUnique({
    where: {
      email: parsed.data.email,
    },
  });

  if (existing) {
    const params = new URLSearchParams({
      existing: "1",
      email: parsed.data.email,
    });

    if (next) {
      params.set("next", next);
    }

    return redirectTo(request, `/login?${params.toString()}`);
  }

  await db.user.create({
    data: {
      email: parsed.data.email,
      displayName: parsed.data.displayName,
      passwordHash: await hashPassword(parsed.data.password),
    },
  });

  const params = new URLSearchParams({
    registered: "1",
    email: parsed.data.email,
  });

  if (next) {
    params.set("next", next);
  }

  return redirectTo(request, `/login?${params.toString()}`);
}
