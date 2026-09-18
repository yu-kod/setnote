import { describe, it, expect, vi } from "vitest";

// app.ts が他ルート経由で読み込む外部クライアントを無効化する。
// health 自体は外部依存を持たないが、app 経由でマウントを検証するため必要。
vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: { from: () => ({ send: vi.fn() }) },
  GetCommand: class {
    constructor(public input: unknown) {}
  },
  PutCommand: class {
    constructor(public input: unknown) {}
  },
  UpdateCommand: class {
    constructor(public input: unknown) {}
  },
  DeleteCommand: class {
    constructor(public input: unknown) {}
  },
  QueryCommand: class {
    constructor(public input: unknown) {}
  },
}));

vi.mock("aws-jwt-verify", () => ({
  CognitoJwtVerifier: {
    create: () => ({ verify: vi.fn() }),
  },
}));

vi.mock("@aws-sdk/client-cognito-identity-provider", () => ({
  CognitoIdentityProviderClient: class {
    send = vi.fn();
  },
  SignUpCommand: class {
    constructor(public input: unknown) {}
  },
  InitiateAuthCommand: class {
    constructor(public input: unknown) {}
  },
  ConfirmSignUpCommand: class {
    constructor(public input: unknown) {}
  },
}));

describe("GET /api/health", () => {
  it("認証なしで 200 と status:ok を返す", async () => {
    const { app } = await import("../app");

    const res = await app.request("/api/health");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: "ok" });
  });
});
