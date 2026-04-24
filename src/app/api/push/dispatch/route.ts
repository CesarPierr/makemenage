import webpush from "web-push";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { logError, logInfo } from "@/lib/logger";

// This route is called by the cron job on the server — protect with a shared secret.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL ?? "mailto:admin@makemenage.fr";

  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ error: "VAPID non configuré" }, { status: 503 });
  }

  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

  const body = await request.json().catch(() => ({})) as { payload?: object };
  const payload = JSON.stringify(body.payload ?? { title: "makemenage", body: "Nouvelles tâches à faire !", url: "/app" });

  const subscriptions = await db.pushSubscription.findMany();
  let sent = 0;
  let failed = 0;

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // Subscription expired — clean up
          await db.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => undefined);
        }
        failed++;
        logError("push.dispatch.send", err, { endpoint: sub.endpoint });
      }
    }),
  );

  logInfo("push.dispatch", { sent, failed, total: subscriptions.length });
  return NextResponse.json({ sent, failed });
}
