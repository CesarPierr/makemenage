import { afterEach, describe, expect, it } from "vitest";

import { getRequestOrigin, resolveAppUrl, shouldUseSecureCookies } from "@/lib/request";

const originalAppBaseUrl = process.env.APP_BASE_URL;

afterEach(() => {
  process.env.APP_BASE_URL = originalAppBaseUrl;
});

describe("request helpers", () => {
  it("prefers forwarded headers for the public origin", () => {
    process.env.APP_BASE_URL = "http://192.168.1.132";

    const request = new Request("http://localhost:3000/api/auth/login", {
      headers: {
        "x-forwarded-host": "menage.example.com",
        "x-forwarded-proto": "https",
      },
    });

    expect(getRequestOrigin(request)).toBe("https://menage.example.com");
    expect(resolveAppUrl(request, "/app").toString()).toBe("https://menage.example.com/app");
    expect(shouldUseSecureCookies(request)).toBe(true);
  });

  it("falls back to APP_BASE_URL when the app sees an internal localhost URL", () => {
    process.env.APP_BASE_URL = "http://192.168.1.132";

    const request = new Request("http://localhost:3000/api/auth/register");

    expect(getRequestOrigin(request)).toBe("http://192.168.1.132");
    expect(resolveAppUrl(request, "/app").toString()).toBe("http://192.168.1.132/app");
    expect(shouldUseSecureCookies(request)).toBe(false);
  });

  it("uses the request URL as a last resort when no public base is configured", () => {
    delete process.env.APP_BASE_URL;

    const request = new Request("https://localhost:3100/api/auth/register");

    expect(getRequestOrigin(request)).toBe("https://localhost:3100");
    expect(shouldUseSecureCookies(request)).toBe(true);
  });
});
