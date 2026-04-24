import { describe, it, expect, vi, beforeEach } from "vitest";

// We need to mock 'server-only' since tests don't run in the server context
vi.mock("server-only", () => ({}));

// Import after mocking
const { logInfo, logWarn, logError } = await import("@/lib/logger");

describe("logger", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.clearAllMocks();
  });

  it("logInfo writes JSON with level=info", () => {
    logInfo("test.event", { foo: "bar" });
    expect(console.log).toHaveBeenCalledOnce();
    const raw = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    const parsed = JSON.parse(raw);
    expect(parsed.level).toBe("info");
    expect(parsed.event).toBe("test.event");
    expect(parsed.foo).toBe("bar");
    expect(parsed.ts).toBeTruthy();
  });

  it("logWarn writes JSON with level=warn", () => {
    logWarn("test.warn");
    const raw = (console.warn as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    const parsed = JSON.parse(raw);
    expect(parsed.level).toBe("warn");
  });

  it("logError writes JSON with level=error and message", () => {
    logError("test.err", new Error("boom"));
    const raw = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    const parsed = JSON.parse(raw);
    expect(parsed.level).toBe("error");
    expect(parsed.message).toBe("boom");
  });

  it("logError handles non-Error values", () => {
    logError("test.err", "string error");
    const raw = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    const parsed = JSON.parse(raw);
    expect(parsed.message).toBe("string error");
  });
});
