import { NextResponse } from "next/server";

import { createOidcAuthorization, getOidcSettings } from "@/lib/oidc";
import { normalizeNextPath, shouldUseSecureCookies } from "@/lib/request";

export const dynamic = "force-dynamic";

const TRANSACTION_MAX_AGE_SECONDS = 10 * 60;

export async function GET(request: Request) {
  if (!getOidcSettings()) {
    return NextResponse.json({ error: "SSO is not configured." }, { status: 404 });
  }

  const transaction = await createOidcAuthorization();
  const response = NextResponse.redirect(transaction.authorizationUrl);
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: shouldUseSecureCookies(request),
    path: "/",
    maxAge: TRANSACTION_MAX_AGE_SECONDS,
  };
  const next = normalizeNextPath(new URL(request.url).searchParams.get("next"));

  response.cookies.set("quotidy_oidc_verifier", transaction.codeVerifier, cookieOptions);
  response.cookies.set("quotidy_oidc_nonce", transaction.nonce, cookieOptions);
  response.cookies.set("quotidy_oidc_state", transaction.state, cookieOptions);

  if (next) {
    response.cookies.set("quotidy_oidc_next", next, cookieOptions);
  }

  return response;
}
