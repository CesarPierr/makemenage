import crypto from "crypto";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { redirectTo } from "@/lib/request";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  // Always redirect to the same success page to prevent email enumeration
  const successUrl = new URL("/forgot-password?sent=1", request.url).toString();

  if (!email) {
    return redirectTo(request, successUrl);
  }

  const user = await db.user.findUnique({ where: { email } });

  if (user) {
    // Invalidate existing tokens for this user
    await db.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const baseUrl = process.env.APP_BASE_URL ?? new URL(request.url).origin;
    const resetUrl = `${baseUrl}/reset-password/${rawToken}`;
    await sendPasswordResetEmail(email, resetUrl);
  }

  return redirectTo(request, successUrl);
}
