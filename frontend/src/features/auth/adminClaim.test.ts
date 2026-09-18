import { describe, it, expect } from "vitest";
import { hasAdminGroup } from "./adminClaim";

function tokenWith(payload: unknown): string {
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `header.${body}.signature`;
}

describe("hasAdminGroup", () => {
  it("is true when the token carries the admin group", () => {
    expect(hasAdminGroup(tokenWith({ sub: "u1", "cognito:groups": ["admin"] }))).toBe(true);
  });

  it("is true when admin is one of several groups", () => {
    expect(hasAdminGroup(tokenWith({ "cognito:groups": ["beta", "admin"] }))).toBe(true);
  });

  it("is false when the token carries other groups only", () => {
    expect(hasAdminGroup(tokenWith({ "cognito:groups": ["beta"] }))).toBe(false);
  });

  it("is false when the token carries no groups claim", () => {
    expect(hasAdminGroup(tokenWith({ sub: "u1" }))).toBe(false);
  });

  it("is false when the groups claim is not an array", () => {
    expect(hasAdminGroup(tokenWith({ "cognito:groups": "admin" }))).toBe(false);
  });

  it("is false for a missing token", () => {
    expect(hasAdminGroup(null)).toBe(false);
    expect(hasAdminGroup("")).toBe(false);
  });

  it("is false for a token that is not a three part JWT", () => {
    expect(hasAdminGroup("not-a-jwt")).toBe(false);
  });

  it("is false when the payload is not decodable", () => {
    expect(hasAdminGroup("header.!!!not-base64!!!.signature")).toBe(false);
  });

  it("is false when the payload is not JSON", () => {
    expect(hasAdminGroup(`header.${btoa("hello")}.signature`)).toBe(false);
  });
});
