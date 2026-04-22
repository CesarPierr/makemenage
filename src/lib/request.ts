import { NextResponse } from "next/server";

function readFirstHeader(headers: Headers, name: string) {
  const value = headers.get(name);

  if (!value) {
    return null;
  }

  return value.split(",")[0]?.trim() || null;
}

function getConfiguredAppBaseUrl() {
  const configured = process.env.APP_BASE_URL;

  if (!configured) {
    return null;
  }

  try {
    return new URL(configured);
  } catch {
    return null;
  }
}

export function getRequestOrigin(request: Request) {
  const forwardedProto = readFirstHeader(request.headers, "x-forwarded-proto");
  const forwardedHost = readFirstHeader(request.headers, "x-forwarded-host");
  const configuredBaseUrl = getConfiguredAppBaseUrl();

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  if (configuredBaseUrl) {
    return configuredBaseUrl.origin;
  }

  if (forwardedHost) {
    const protocol = forwardedProto ?? new URL(request.url).protocol.replace(/:$/, "");

    return `${protocol}://${forwardedHost}`;
  }

  const host = readFirstHeader(request.headers, "host");

  if (host) {
    return `${new URL(request.url).protocol}//${host}`;
  }

  return new URL(request.url).origin;
}

export function resolveAppUrl(request: Request, path: string) {
  return new URL(path, getRequestOrigin(request));
}

export function redirectTo(request: Request, path: string, status = 303) {
  return NextResponse.redirect(resolveAppUrl(request, path), status);
}

export function shouldUseSecureCookies(request: Request) {
  const forwardedProto = readFirstHeader(request.headers, "x-forwarded-proto");

  if (forwardedProto) {
    return forwardedProto === "https";
  }

  const configuredBaseUrl = getConfiguredAppBaseUrl();

  if (configuredBaseUrl) {
    return configuredBaseUrl.protocol === "https:";
  }

  return new URL(request.url).protocol === "https:";
}

export function normalizeNextPath(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (!value.startsWith("/")) {
    return null;
  }

  if (value.startsWith("//")) {
    return null;
  }

  return value;
}
