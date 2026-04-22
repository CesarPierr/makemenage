import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  createSession: vi.fn(),
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

const dbMocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userCreate: vi.fn(),
  userUpdate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  createSession: authMocks.createSession,
  hashPassword: authMocks.hashPassword,
  verifyPassword: authMocks.verifyPassword,
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: dbMocks.userFindUnique,
      create: dbMocks.userCreate,
      update: dbMocks.userUpdate,
    },
  },
}));

import { POST as loginPost } from "@/app/api/auth/login/route";
import { POST as registerPost } from "@/app/api/auth/register/route";

function buildFormRequest(
  url: string,
  fields: Record<string, string>,
  headers: Record<string, string> = {},
) {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...headers,
    },
    body: new URLSearchParams(fields).toString(),
  });
}

describe("auth routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_BASE_URL = "http://192.168.1.132";
  });

  it("register redirects to login on the public base URL and does not create a session yet", async () => {
    dbMocks.userFindUnique.mockResolvedValue(null);
    authMocks.hashPassword.mockResolvedValue("hashed-password");
    dbMocks.userCreate.mockResolvedValue({ id: "user-1" });

    const response = await registerPost(
      buildFormRequest("http://localhost:3000/api/auth/register", {
        displayName: "Pierre",
        email: "pierre@example.com",
        password: "motdepasse123",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "http://192.168.1.132/login?registered=1&email=pierre%40example.com",
    );
    expect(authMocks.createSession).not.toHaveBeenCalled();
  });

  it("register preserves the next path so an invited user can continue", async () => {
    dbMocks.userFindUnique.mockResolvedValue(null);
    authMocks.hashPassword.mockResolvedValue("hashed-password");
    dbMocks.userCreate.mockResolvedValue({ id: "user-1" });

    const response = await registerPost(
      buildFormRequest("http://localhost:3000/api/auth/register", {
        displayName: "Pierre",
        email: "pierre@example.com",
        password: "motdepasse123",
        next: "/join/token-123",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "http://192.168.1.132/login?registered=1&email=pierre%40example.com&next=%2Fjoin%2Ftoken-123",
    );
  });

  it("login prefers forwarded HTTPS headers for redirects and secure cookies", async () => {
    dbMocks.userFindUnique.mockResolvedValue({ id: "user-2", passwordHash: "stored-hash" });
    authMocks.verifyPassword.mockResolvedValue(true);
    dbMocks.userUpdate.mockResolvedValue({ id: "user-2" });

    const response = await loginPost(
      buildFormRequest(
        "http://localhost:3000/api/auth/login",
        {
          email: "pierre@example.com",
          password: "motdepasse123",
        },
        {
          "x-forwarded-host": "menage.example.com",
          "x-forwarded-proto": "https",
        },
      ),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://menage.example.com/app");
    expect(authMocks.createSession).toHaveBeenCalledWith("user-2", { secure: true });
  });

  it("login redirects to the requested next path after success", async () => {
    dbMocks.userFindUnique.mockResolvedValue({ id: "user-2", passwordHash: "stored-hash" });
    authMocks.verifyPassword.mockResolvedValue(true);
    dbMocks.userUpdate.mockResolvedValue({ id: "user-2" });

    const response = await loginPost(
      buildFormRequest("http://localhost:3000/api/auth/login", {
        email: "pierre@example.com",
        password: "motdepasse123",
        next: "/join/token-123",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://192.168.1.132/join/token-123");
  });

  it("login stays on the public login page when credentials are invalid", async () => {
    dbMocks.userFindUnique.mockResolvedValue({ id: "user-2", passwordHash: "stored-hash" });
    authMocks.verifyPassword.mockResolvedValue(false);

    const response = await loginPost(
      buildFormRequest("http://localhost:3000/api/auth/login", {
        email: "pierre@example.com",
        password: "mauvaispass123",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "http://192.168.1.132/login?error=invalid_credentials&email=pierre%40example.com",
    );
    expect(authMocks.createSession).not.toHaveBeenCalled();
  });

  it("login redirects back to login with the submitted email when validation fails", async () => {
    const response = await loginPost(
      buildFormRequest("http://localhost:3000/api/auth/login", {
        email: "pierre@example.com",
        password: "short",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "http://192.168.1.132/login?error=invalid_credentials&email=pierre%40example.com",
    );
    expect(authMocks.createSession).not.toHaveBeenCalled();
  });
});
