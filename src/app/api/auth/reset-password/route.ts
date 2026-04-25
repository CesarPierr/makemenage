import crypto from "crypto";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { redirectTo } from "@/lib/request";

export async function POST(request: Request) {
  const formData = await request.formData();
  const rawToken = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!rawToken || !password || password.length < 8 || password !== confirm) {
    return redirectTo(request, `/reset-password/${rawToken}?error=invalid`);
  }

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return redirectTo(request, `/reset-password/${rawToken}?error=expired`);
  }

  const passwordHash = await hashPassword(password);

  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Invalidate all sessions so the user must log in with the new password
    db.session.deleteMany({ where: { userId: record.userId } }),
  ]);

  return redirectTo(request, "/login?reset=1");
}
