import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  createSession: vi.fn(),
  hashPassword: vi.fn(),
}));

const dbMocks = vi.hoisted(() => ({
  userCreate: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
}));

vi.mock("@/lib/auth", () => authMocks);
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      create: dbMocks.userCreate,
      findUnique: dbMocks.userFindUnique,
      update: dbMocks.userUpdate,
    },
  },
}));

import { findOrCreateOidcUser } from "@/app/api/auth/oidc/callback/route";

const profile = {
  issuer: "https://auth.example.com/application/o/quotidy/",
  subject: "stable-subject",
  email: "marie@example.com",
  emailVerified: false,
  displayName: "Marie",
};

describe("OIDC account provisioning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.hashPassword.mockResolvedValue("random-password-hash");
  });

  it("uses the issuer and subject when the identity is already linked", async () => {
    dbMocks.userFindUnique.mockResolvedValueOnce({
      id: "user-1",
      emailVerifiedAt: null,
    });
    dbMocks.userUpdate.mockResolvedValue({ id: "user-1" });

    await findOrCreateOidcUser(profile);

    expect(dbMocks.userFindUnique).toHaveBeenCalledWith({
      where: {
        oidcIssuer_oidcSubject: {
          oidcIssuer: profile.issuer,
          oidcSubject: profile.subject,
        },
      },
    });
    expect(dbMocks.userCreate).not.toHaveBeenCalled();
  });

  it("links an existing local account on the first SSO login", async () => {
    dbMocks.userFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "user-2",
        oidcIssuer: null,
        oidcSubject: null,
        emailVerifiedAt: null,
      });
    dbMocks.userUpdate.mockResolvedValue({ id: "user-2" });

    await findOrCreateOidcUser({ ...profile, emailVerified: true });

    expect(dbMocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-2" },
      data: expect.objectContaining({
        oidcIssuer: profile.issuer,
        oidcSubject: profile.subject,
      }),
    });
  });

  it("refuses to link an existing account from an unverified email claim", async () => {
    dbMocks.userFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "user-2",
        oidcIssuer: null,
        oidcSubject: null,
        emailVerifiedAt: null,
      });

    await expect(findOrCreateOidcUser(profile)).rejects.toThrow("verified email");
    expect(dbMocks.userUpdate).not.toHaveBeenCalled();
    expect(dbMocks.userCreate).not.toHaveBeenCalled();
  });

  it("creates a recoverable local account for a new OIDC identity", async () => {
    dbMocks.userFindUnique.mockResolvedValue(null);
    dbMocks.userCreate.mockResolvedValue({ id: "user-3" });

    await findOrCreateOidcUser(profile);

    expect(authMocks.hashPassword).toHaveBeenCalledOnce();
    expect(dbMocks.userCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: profile.email,
        displayName: profile.displayName,
        oidcIssuer: profile.issuer,
        oidcSubject: profile.subject,
        passwordHash: "random-password-hash",
      }),
    });
  });
});
