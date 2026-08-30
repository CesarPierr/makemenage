import "server-only";

import * as client from "openid-client";

export type OidcSettings = {
  issuer: string;
  clientId: string;
  clientSecret: string;
  displayName: string;
  redirectUri: string;
};

export type OidcProfile = {
  issuer: string;
  subject: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
};

type OidcTransaction = {
  codeVerifier: string;
  nonce: string;
  state: string;
};

let cachedConfiguration:
  | { key: string; value: Promise<client.Configuration> }
  | undefined;

function parseUrl(name: string, value: string) {
  try {
    return new URL(value);
  } catch {
    throw new Error(`[oidc] ${name} must be an absolute URL.`);
  }
}

export function getOidcSettings(): OidcSettings | null {
  const issuer = process.env.OIDC_ISSUER?.trim();
  const clientId = process.env.OIDC_CLIENT_ID?.trim();
  const clientSecret = process.env.OIDC_CLIENT_SECRET?.trim();
  const appBaseUrl = process.env.APP_BASE_URL?.trim();
  const configuredValues = [issuer, clientId, clientSecret].filter(Boolean);

  if (configuredValues.length === 0) {
    return null;
  }

  if (!issuer || !clientId || !clientSecret || !appBaseUrl) {
    throw new Error(
      "[oidc] OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET and APP_BASE_URL must be configured together.",
    );
  }

  const issuerUrl = parseUrl("OIDC_ISSUER", issuer);
  const baseUrl = parseUrl("APP_BASE_URL", appBaseUrl);

  if (
    process.env.NODE_ENV === "production" &&
    (issuerUrl.protocol !== "https:" || baseUrl.protocol !== "https:")
  ) {
    throw new Error("[oidc] HTTPS is required for OIDC in production.");
  }

  return {
    issuer: issuerUrl.href,
    clientId,
    clientSecret,
    displayName: process.env.OIDC_DISPLAY_NAME?.trim() || "SSO",
    redirectUri: new URL("/api/auth/oidc/callback", baseUrl).href,
  };
}

async function getConfiguration(settings: OidcSettings) {
  const key = `${settings.issuer}\n${settings.clientId}\n${settings.clientSecret}`;

  if (!cachedConfiguration || cachedConfiguration.key !== key) {
    cachedConfiguration = {
      key,
      value: client.discovery(
        new URL(settings.issuer),
        settings.clientId,
        settings.clientSecret,
      ),
    };
  }

  return cachedConfiguration.value;
}

export async function createOidcAuthorization(): Promise<
  OidcTransaction & { authorizationUrl: URL }
> {
  const settings = getOidcSettings();

  if (!settings) {
    throw new Error("[oidc] OIDC is not configured.");
  }

  const configuration = await getConfiguration(settings);
  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const nonce = client.randomNonce();
  const state = client.randomState();
  const authorizationUrl = client.buildAuthorizationUrl(configuration, {
    redirect_uri: settings.redirectUri,
    scope: "openid profile email",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    nonce,
    state,
  });

  return { authorizationUrl, codeVerifier, nonce, state };
}

function stringClaim(claims: client.IDToken, key: string) {
  const value = claims[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function exchangeOidcAuthorization(
  callbackUrl: URL,
  transaction: OidcTransaction,
): Promise<OidcProfile> {
  const settings = getOidcSettings();

  if (!settings) {
    throw new Error("[oidc] OIDC is not configured.");
  }

  const configuration = await getConfiguration(settings);
  const tokens = await client.authorizationCodeGrant(
    configuration,
    callbackUrl,
    {
      pkceCodeVerifier: transaction.codeVerifier,
      expectedNonce: transaction.nonce,
      expectedState: transaction.state,
      idTokenExpected: true,
    },
    { redirect_uri: settings.redirectUri },
  );
  const claims = tokens.claims();
  const subject = claims && stringClaim(claims, "sub");
  const email = claims && stringClaim(claims, "email")?.toLowerCase();
  const displayName =
    (claims && stringClaim(claims, "name")) ||
    (claims && stringClaim(claims, "preferred_username")) ||
    email?.split("@")[0];

  if (!claims || !subject || !email || !displayName) {
    throw new Error("[oidc] The ID token is missing the required identity claims.");
  }

  return {
    issuer: settings.issuer,
    subject,
    email,
    emailVerified: claims.email_verified === true,
    displayName,
  };
}
