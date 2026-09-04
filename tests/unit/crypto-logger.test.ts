import { describe, expect, it } from "vitest";
import { decryptStoredTokens, encryptStoredTokens, encryptionKeyFromSecret } from "@/security/crypto";
import { redactForLogs } from "@/security/logger";
import { setRequiredEnv } from "../env";

setRequiredEnv();

describe("crypto and logger", () => {
  it("round-trips AES-256-GCM token blobs", () => {
    const payload = { accessToken: "secret-token", refreshToken: "refresh" };
    const encrypted = encryptStoredTokens(payload);
    expect(encrypted).not.toContain("secret-token");
    expect(decryptStoredTokens<typeof payload>(encrypted)).toEqual(payload);
  });

  it("accepts 64-hex encryption keys", () => {
    expect(encryptionKeyFromSecret("a".repeat(64)).length).toBe(32);
  });

  it("redacts tokens, secrets, and JWTs from logs", () => {
    const redacted = redactForLogs({
      access_token: "should-not-appear",
      client_secret: "also-secret",
      Authorization: "Bearer abc",
      endpoint: "/campaign/get/",
      token: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc",
    }) as Record<string, unknown>;
    expect(redacted.access_token).toBe("[REDACTED]");
    expect(redacted.client_secret).toBe("[REDACTED]");
    expect(JSON.stringify(redacted)).not.toContain("should-not-appear");
    expect(JSON.stringify(redacted)).toContain("/campaign/get/");
  });
});
