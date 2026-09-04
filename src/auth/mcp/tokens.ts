import { randomUUID } from "node:crypto";
import { getConfig, MCP_INSTANCE_SUB, MCP_SCOPE } from "@/config";
import { mcpResourceUrl } from "@/auth/mcp/metadata";
import { nowSeconds, signJwt, verifyJwt } from "@/auth/mcp/jwt";

const CODE_TTL_SECONDS = 5 * 60;
const ACCESS_TTL_SECONDS = 60 * 60;
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

export interface AuthorizationCodePayload {
  typ: "code";
  iss: string;
  sub: string;
  sid?: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  scope: string;
}

export interface AccessTokenPayload {
  typ: "access";
  iss: string;
  aud: string;
  sub: string;
  sid?: string;
  client_id: string;
  scope: string;
  exp: number;
  iat: number;
}

export interface RefreshTokenPayload {
  typ: "refresh";
  iss: string;
  aud: string;
  sub: string;
  sid?: string;
  client_id: string;
  scope: string;
}

export function createMcpSessionId(): string {
  return randomUUID();
}

export function issueAuthorizationCode(params: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  sub?: string;
  sid?: string;
  scope?: string;
}): string {
  return signJwt({
    typ: "code",
    iss: getConfig().appBaseUrl,
    sub: params.sub || MCP_INSTANCE_SUB,
    sid: params.sid,
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    code_challenge: params.codeChallenge,
    scope: params.scope || MCP_SCOPE,
    iat: nowSeconds(),
    exp: nowSeconds() + CODE_TTL_SECONDS,
  });
}

export function readAuthorizationCode(code: string): AuthorizationCodePayload {
  const payload = verifyJwt<AuthorizationCodePayload>(code);
  if (payload.typ !== "code" || !payload.sub) {
    throw new Error("Invalid authorization code");
  }
  return payload;
}

export function issueAccessToken(params: {
  clientId: string;
  sub?: string;
  sid?: string;
  scope?: string;
}): string {
  return signJwt({
    typ: "access",
    iss: getConfig().appBaseUrl,
    aud: mcpResourceUrl(),
    sub: params.sub || MCP_INSTANCE_SUB,
    sid: params.sid,
    client_id: params.clientId,
    scope: params.scope || MCP_SCOPE,
    iat: nowSeconds(),
    exp: nowSeconds() + ACCESS_TTL_SECONDS,
  });
}

export function issueRefreshToken(params: {
  clientId: string;
  sub?: string;
  sid?: string;
  scope?: string;
}): string {
  return signJwt({
    typ: "refresh",
    iss: getConfig().appBaseUrl,
    aud: mcpResourceUrl(),
    sub: params.sub || MCP_INSTANCE_SUB,
    sid: params.sid,
    client_id: params.clientId,
    scope: params.scope || MCP_SCOPE,
    iat: nowSeconds(),
    exp: nowSeconds() + REFRESH_TTL_SECONDS,
  });
}

export function readRefreshToken(token: string): RefreshTokenPayload {
  const payload = verifyJwt<RefreshTokenPayload>(token);
  if (payload.typ !== "refresh" || !payload.sub) {
    throw new Error("Invalid refresh token");
  }
  return payload;
}

export function readAccessToken(token: string): AccessTokenPayload {
  const payload = verifyJwt<AccessTokenPayload>(token);
  if (payload.typ !== "access" || !payload.sub) {
    throw new Error("Invalid access token");
  }
  if (payload.aud !== mcpResourceUrl() || payload.iss !== getConfig().appBaseUrl) {
    throw new Error("Invalid access token");
  }
  return payload;
}

export function accessTokenExpiresIn(): number {
  return ACCESS_TTL_SECONDS;
}
