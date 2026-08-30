import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSession, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { exchangeOidcAuthorization, getOidcSettings, type OidcProfile } from "@/lib/oidc";
import {
  normalizeNextPath,
  redirectTo,
  shouldUseSecureCookies,
} from "@/lib/request";

export const dynamic = "force-dynamic";

const TRANSACTION_COOKIES = [
  "quotidy_oidc_verifier",
  "quotidy_oidc_nonce",
  "quotidy_oidc_state",
  "quotidy_oidc_next",
] as const;

function clearTransactionCookies(response: NextResponse) {
  for (const name of TRANSACTION_COOKIES) {
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
  }

  return response;
}

export async function findOrCreateOidcUser(profile: OidcProfile) {
  const linkedUser = await db.user.findUnique({
    where: {
      oidcIssuer_oidcSubject: {
        oidcIssuer: profile.issuer,
        oidcSubject: profile.subject,
      },
    },
  });

  if (linkedUser) {
    return db.user.update({
      where: { id: linkedUser.id },
      data: {
        lastLoginAt: new Date(),
        emailVerifiedAt:
          profile.emailVerified && !linkedUser.emailVerifiedAt
            ? new Date()
            : linkedUser.emailVerifiedAt,
      },
    });
  }

  const emailUser = await db.user.findUnique({ where: { email: profile.email } });

  if (emailUser) {
    if (emailUser.oidcIssuer || emailUser.oidcSubject) {
      throw new Error("[oidc] This email is already linked to another OIDC identity.");
    }

    // Linking on an unverified email would let an identity-provider account
    // that merely claims somebody else's address take over the local account.
    if (!profile.emailVerified) {
      throw new Error("[oidc] A verified email is required to link an existing account.");
    }

    return db.user.update({
      where: { id: emailUser.id },
      data: {
        oidcIssuer: profile.issuer,
        oidcSubject: profile.subject,
        lastLoginAt: new Date(),
        emailVerifiedAt:
          profile.emailVerified && !emailUser.emailVerifiedAt
            ? new Date()
            : emailUser.emailVerifiedAt,
      },
    });
  }

  return db.user.create({
    data: {
      email: profile.email,
      displayName: profile.displayName,
      oidcIssuer: profile.issuer,
      oidcSubject: profile.subject,
      emailVerifiedAt: profile.emailVerified ? new Date() : null,
      lastLoginAt: new Date(),
      // Local credentials remain available as a recovery path. The random value
      // is not disclosed; the user can define a password through the reset flow.
      passwordHash: await hashPassword(randomBytes(32).toString("base64url")),
    },
  });
}

export async function GET(request: Request) {
  const settings = getOidcSettings();

  if (!settings) {
    return NextResponse.json({ error: "SSO is not configured." }, { status: 404 });
  }

  const cookieStore = await cookies();
  const codeVerifier = cookieStore.get("quotidy_oidc_verifier")?.value;
  const nonce = cookieStore.get("quotidy_oidc_nonce")?.value;
  const state = cookieStore.get("quotidy_oidc_state")?.value;
  const next = normalizeNextPath(cookieStore.get("quotidy_oidc_next")?.value);

  if (!codeVerifier || !nonce || !state) {
    return clearTransactionCookies(redirectTo(request, "/login?error=oidc_failed"));
  }

  try {
    // The token endpoint must receive the exact registered redirect URI. Do
    // not derive it from forwarded request headers, which may be misconfigured
    // or attacker-controlled outside the expected reverse-proxy topology.
    const callbackUrl = new URL(settings.redirectUri);
    callbackUrl.search = new URL(request.url).search;
    const profile = await exchangeOidcAuthorization(callbackUrl, {
      codeVerifier,
      nonce,
      state,
    });
    const user = await findOrCreateOidcUser(profile);

    await createSession(user.id, { secure: shouldUseSecureCookies(request) });

    return clearTransactionCookies(redirectTo(request, next ?? "/app"));
  } catch (error) {
    console.error(
      "[oidc] Authentication failed.",
      error instanceof Error ? error.message : "Unknown error",
    );
    return clearTransactionCookies(redirectTo(request, "/login?error=oidc_failed"));
  }
}
