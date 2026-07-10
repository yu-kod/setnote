import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: class {
    constructor(public config: unknown) {}
  },
}));

vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: (client: unknown) => ({ client }),
  },
}));

describe("db/client", () => {
  const originalEnv = process.env.DYNAMODB_ENDPOINT;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.DYNAMODB_ENDPOINT;
    } else {
      process.env.DYNAMODB_ENDPOINT = originalEnv;
    }
  });

  it("sets endpoint when DYNAMODB_ENDPOINT env var is defined", async () => {
    process.env.DYNAMODB_ENDPOINT = "http://localhost:8000";

    const { docClient } = await import("./client");
    const client = (docClient as unknown as { client: { config: { endpoint?: string } } }).client;
    expect(client.config.endpoint).toBe("http://localhost:8000");
  });

  it("does not set endpoint when DYNAMODB_ENDPOINT env var is not defined", async () => {
    delete process.env.DYNAMODB_ENDPOINT;

    const { docClient } = await import("./client");
    const client = (docClient as unknown as { client: { config: { endpoint?: string } } }).client;
    expect(client.config.endpoint).toBeUndefined();
  });
});
