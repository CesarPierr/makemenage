import { beforeEach, describe, expect, it, vi } from "vitest";

const oidcMocks = vi.hoisted(() => ({
  authorizationCodeGrant: vi.fn(),
  buildAuthorizationUrl: vi.fn(),
  calculatePKCECodeChallenge: vi.fn(),
  discovery: vi.fn(),
  randomNonce: vi.fn(),
  randomPKCECodeVerifier: vi.fn(),
  randomState: vi.fn(),
}));

vi.mock("openid-client", () => oidcMocks);

import {
  createOidcAuthorization,
  exchangeOidcAuthorization,
  getOidcSettings,
} from "@/lib/oidc";

describe("OIDC integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.OIDC_ISSUER;
    delete process.env.OIDC_CLIENT_ID;
    delete process.env.OIDC_CLIENT_SECRET;
    delete process.env.OIDC_DISPLAY_NAME;
    process.env.APP_BASE_URL = "https://quotidy.example.com";
    vi.stubEnv("NODE_ENV", "test");

    oidcMocks.discovery.mockResolvedValue({ configuration: true });
    oidcMocks.randomPKCECodeVerifier.mockReturnValue("verifier");
    oidcMocks.calculatePKCECodeChallenge.mockResolvedValue("challenge");
    oidcMocks.randomNonce.mockReturnValue("nonce");
    oidcMocks.randomState.mockReturnValue("state");
    oidcMocks.buildAuthorizationUrl.mockReturnValue(
      new URL("https://auth.example.com/authorize"),
    );
  });

  it("stays disabled when no OIDC provider is configured", () => {
    expect(getOidcSettings()).toBeNull();
  });

  it("rejects a partial OIDC configuration", () => {
    process.env.OIDC_ISSUER = "https://auth.example.com/application/o/quotidy/";

    expect(() => getOidcSettings()).toThrow("must be configured together");
  });

  it("builds an authorization-code request with PKCE, state and nonce", async () => {
    process.env.OIDC_ISSUER = "https://auth.example.com/application/o/quotidy/";
    process.env.OIDC_CLIENT_ID = "quotidy";
    process.env.OIDC_CLIENT_SECRET = "client-secret";
    process.env.OIDC_DISPLAY_NAME = "NobisD";

    const transaction = await createOidcAuthorization();

    expect(transaction).toEqual({
      authorizationUrl: new URL("https://auth.example.com/authorize"),
      codeVerifier: "verifier",
      nonce: "nonce",
      state: "state",
    });
    expect(oidcMocks.buildAuthorizationUrl).toHaveBeenCalledWith(
      { configuration: true },
      {
        redirect_uri: "https://quotidy.example.com/api/auth/oidc/callback",
        scope: "openid profile email",
        code_challenge: "challenge",
        code_challenge_method: "S256",
        nonce: "nonce",
        state: "state",
      },
    );
  });

  it("validates the callback and returns the stable OIDC identity", async () => {
    process.env.OIDC_ISSUER = "https://auth.example.com/application/o/quotidy/";
    process.env.OIDC_CLIENT_ID = "quotidy";
    process.env.OIDC_CLIENT_SECRET = "client-secret";
    oidcMocks.authorizationCodeGrant.mockResolvedValue({
      claims: () => ({
        sub: "authentik-user-id",
        email: "USER@Example.com",
        email_verified: true,
        name: "Marie",
      }),
    });

    const profile = await exchangeOidcAuthorization(
      new URL("https://quotidy.example.com/api/auth/oidc/callback?code=abc&state=state"),
      { codeVerifier: "verifier", nonce: "nonce", state: "state" },
    );

    expect(profile).toEqual({
      issuer: "https://auth.example.com/application/o/quotidy/",
      subject: "authentik-user-id",
      email: "user@example.com",
      emailVerified: true,
      displayName: "Marie",
    });
    expect(oidcMocks.authorizationCodeGrant).toHaveBeenCalledWith(
      { configuration: true },
      expect.any(URL),
      {
        pkceCodeVerifier: "verifier",
        expectedNonce: "nonce",
        expectedState: "state",
        idTokenExpected: true,
      },
      { redirect_uri: "https://quotidy.example.com/api/auth/oidc/callback" },
    );
  });
});
