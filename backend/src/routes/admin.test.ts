import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDynamoSend = vi.fn();
vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: { from: () => ({ send: mockDynamoSend }) },
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
  ScanCommand: class {
    constructor(public input: unknown) {}
  },
}));

const mockCognitoSend = vi.fn();
vi.mock("@aws-sdk/client-cognito-identity-provider", () => ({
  CognitoIdentityProviderClient: class {
    send = mockCognitoSend;
  },
  SignUpCommand: class {},
  ConfirmSignUpCommand: class {},
  InitiateAuthCommand: class {},
  ResendConfirmationCodeCommand: class {},
  ListUsersCommand: class {
    constructor(public input: unknown) {}
  },
}));

const mockCloudWatchSend = vi.fn();
vi.mock("@aws-sdk/client-cloudwatch", () => ({
  CloudWatchClient: class {
    send = mockCloudWatchSend;
  },
  GetMetricDataCommand: class {
    constructor(public input: unknown) {}
  },
}));

const mockVerify = vi.fn();
vi.mock("aws-jwt-verify", () => ({
  CognitoJwtVerifier: {
    create: () => ({ verify: mockVerify }),
  },
}));

const ADMIN_HEADERS = {
  "Content-Type": "application/json",
  Authorization: "Bearer admin-token",
};

function asAdmin() {
  mockVerify.mockResolvedValue({ sub: "admin-1", "cognito:groups": ["admin"] });
}

function asMember() {
  mockVerify.mockResolvedValue({ sub: "member-1" });
}

beforeEach(() => {
  vi.resetModules();
  mockDynamoSend.mockReset();
  mockCognitoSend.mockReset();
  mockCloudWatchSend.mockReset();
  mockVerify.mockReset();
  process.env.COGNITO_USER_POOL_ID = "pool-1";
  process.env.API_GATEWAY_ID = "api-1";
  process.env.AWS_LAMBDA_FUNCTION_NAME = "setnote-api";
});

describe("GET /api/admin/users", () => {
  it("returns 401 without a token", async () => {
    const { app } = await import("../app");
    const res = await app.request("/api/admin/users");

    expect(res.status).toBe(401);
    expect(mockCognitoSend).not.toHaveBeenCalled();
  });

  it("returns 403 for a signed in non-admin", async () => {
    asMember();
    const { app } = await import("../app");

    const res = await app.request("/api/admin/users", { headers: ADMIN_HEADERS });

    expect(res.status).toBe(403);
    expect(mockCognitoSend).not.toHaveBeenCalled();
  });

  it("returns aggregated user statistics for an admin", async () => {
    asAdmin();
    mockCognitoSend.mockResolvedValue({
      Users: [
        { UserStatus: "CONFIRMED", Enabled: true, UserCreateDate: new Date() },
        { UserStatus: "UNCONFIRMED", Enabled: true, UserCreateDate: new Date() },
      ],
    });
    const { app } = await import("../app");

    const res = await app.request("/api/admin/users", { headers: ADMIN_HEADERS });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { total: number; confirmed: number; growth: unknown[] };
    expect(body.total).toBe(2);
    expect(body.confirmed).toBe(1);
    expect(body.growth).toHaveLength(30);
  });

  it("queries the configured user pool", async () => {
    asAdmin();
    mockCognitoSend.mockResolvedValue({ Users: [] });
    const { app } = await import("../app");

    await app.request("/api/admin/users", { headers: ADMIN_HEADERS });

    const command = mockCognitoSend.mock.calls[0][0] as { input: Record<string, unknown> };
    expect(command.input.UserPoolId).toBe("pool-1");
  });

  it("follows the pagination token until every user is read", async () => {
    asAdmin();
    mockCognitoSend
      .mockResolvedValueOnce({ Users: [{ UserStatus: "CONFIRMED" }], PaginationToken: "next" })
      .mockResolvedValueOnce({ Users: [{ UserStatus: "CONFIRMED" }] });
    const { app } = await import("../app");

    const res = await app.request("/api/admin/users", { headers: ADMIN_HEADERS });

    const body = (await res.json()) as { total: number };
    expect(body.total).toBe(2);
    expect(mockCognitoSend).toHaveBeenCalledTimes(2);
    const second = mockCognitoSend.mock.calls[1][0] as { input: Record<string, unknown> };
    expect(second.input.PaginationToken).toBe("next");
  });

  it("copes with a page that carries no Users array", async () => {
    asAdmin();
    mockCognitoSend.mockResolvedValue({});
    const { app } = await import("../app");

    const res = await app.request("/api/admin/users", { headers: ADMIN_HEADERS });

    const body = (await res.json()) as { total: number };
    expect(body.total).toBe(0);
  });
});

describe("GET /api/admin/content", () => {
  it("returns 403 for a non-admin", async () => {
    asMember();
    const { app } = await import("../app");

    const res = await app.request("/api/admin/content", { headers: ADMIN_HEADERS });

    expect(res.status).toBe(403);
    expect(mockDynamoSend).not.toHaveBeenCalled();
  });

  it("returns aggregated content statistics for an admin", async () => {
    asAdmin();
    mockDynamoSend.mockResolvedValue({
      Items: [
        { id: "a", userId: "u1", status: "published", viewCount: 4, likeCounts: { t1: 2 } },
        { id: "b", userId: "u1", status: "draft" },
      ],
    });
    const { app } = await import("../app");

    const res = await app.request("/api/admin/content", { headers: ADMIN_HEADERS });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      setlists: 2,
      published: 1,
      draft: 1,
      totalViews: 4,
      totalLikes: 2,
      totalTracks: 0,
      activeUsers: 1,
    });
  });

  it("follows LastEvaluatedKey until the whole table is read", async () => {
    asAdmin();
    mockDynamoSend
      .mockResolvedValueOnce({ Items: [{ id: "a" }], LastEvaluatedKey: { id: "a" } })
      .mockResolvedValueOnce({ Items: [{ id: "b" }] });
    const { app } = await import("../app");

    const res = await app.request("/api/admin/content", { headers: ADMIN_HEADERS });

    const body = (await res.json()) as { setlists: number };
    expect(body.setlists).toBe(2);
    const second = mockDynamoSend.mock.calls[1][0] as { input: Record<string, unknown> };
    expect(second.input.ExclusiveStartKey).toEqual({ id: "a" });
  });

  it("copes with a page that carries no Items array", async () => {
    asAdmin();
    mockDynamoSend.mockResolvedValue({});
    const { app } = await import("../app");

    const res = await app.request("/api/admin/content", { headers: ADMIN_HEADERS });

    const body = (await res.json()) as { setlists: number };
    expect(body.setlists).toBe(0);
  });
});

describe("GET /api/admin/health", () => {
  it("returns 403 for a non-admin", async () => {
    asMember();
    const { app } = await import("../app");

    const res = await app.request("/api/admin/health", { headers: ADMIN_HEADERS });

    expect(res.status).toBe(403);
    expect(mockCloudWatchSend).not.toHaveBeenCalled();
  });

  it("returns the health summary for an admin", async () => {
    asAdmin();
    mockCloudWatchSend.mockResolvedValue({
      MetricDataResults: [
        { Id: "invocations", Timestamps: [new Date("2026-09-18T01:00:00Z")], Values: [10] },
        { Id: "errors", Timestamps: [new Date("2026-09-18T01:00:00Z")], Values: [0] },
      ],
    });
    const { app } = await import("../app");

    const res = await app.request("/api/admin/health", { headers: ADMIN_HEADERS });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { invocations: number; status: string };
    expect(body.invocations).toBe(10);
    expect(body.status).toBe("ok");
  });

  it("asks CloudWatch for the lambda and api gateway metrics of the last 24 hours", async () => {
    asAdmin();
    mockCloudWatchSend.mockResolvedValue({ MetricDataResults: [] });
    const { app } = await import("../app");

    await app.request("/api/admin/health", { headers: ADMIN_HEADERS });

    const command = mockCloudWatchSend.mock.calls[0][0] as {
      input: {
        StartTime: Date;
        EndTime: Date;
        MetricDataQueries: {
          Id: string;
          MetricStat: { Metric: { Dimensions: { Name: string; Value: string }[] } };
        }[];
      };
    };
    const queries = command.input.MetricDataQueries;
    expect(queries.map((q) => q.Id)).toEqual([
      "invocations",
      "errors",
      "throttles",
      "duration",
      "apiRequests",
      "api5xx",
    ]);
    expect(queries[0].MetricStat.Metric.Dimensions).toEqual([
      { Name: "FunctionName", Value: "setnote-api" },
    ]);
    expect(queries[4].MetricStat.Metric.Dimensions).toEqual([{ Name: "ApiId", Value: "api-1" }]);
    const windowMs = command.input.EndTime.getTime() - command.input.StartTime.getTime();
    expect(windowMs).toBe(24 * 60 * 60 * 1000);
  });

  it("copes with a response that carries no metric results", async () => {
    asAdmin();
    mockCloudWatchSend.mockResolvedValue({});
    const { app } = await import("../app");

    const res = await app.request("/api/admin/health", { headers: ADMIN_HEADERS });

    const body = (await res.json()) as { invocations: number; status: string };
    expect(body.invocations).toBe(0);
    expect(body.status).toBe("ok");
  });
});

describe("admin routes without environment configuration", () => {
  it("asks Cognito for an empty user pool id when none is configured", async () => {
    asAdmin();
    delete process.env.COGNITO_USER_POOL_ID;
    mockCognitoSend.mockResolvedValue({ Users: [] });
    const { app } = await import("../app");

    await app.request("/api/admin/users", { headers: ADMIN_HEADERS });

    const command = mockCognitoSend.mock.calls[0][0] as { input: Record<string, unknown> };
    expect(command.input.UserPoolId).toBe("");
  });

  it("falls back to the default function name and an empty api id", async () => {
    asAdmin();
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    delete process.env.API_GATEWAY_ID;
    delete process.env.AWS_REGION;
    mockCloudWatchSend.mockResolvedValue({ MetricDataResults: [] });
    const { app } = await import("../app");

    await app.request("/api/admin/health", { headers: ADMIN_HEADERS });

    const command = mockCloudWatchSend.mock.calls[0][0] as {
      input: {
        MetricDataQueries: {
          MetricStat: { Metric: { Dimensions: { Name: string; Value: string }[] } };
        }[];
      };
    };
    const queries = command.input.MetricDataQueries;
    expect(queries[0].MetricStat.Metric.Dimensions).toEqual([
      { Name: "FunctionName", Value: "setnote-api" },
    ]);
    expect(queries[4].MetricStat.Metric.Dimensions).toEqual([{ Name: "ApiId", Value: "" }]);
  });

  it("uses the configured region when one is set", async () => {
    asAdmin();
    process.env.AWS_REGION = "us-east-1";
    mockCloudWatchSend.mockResolvedValue({ MetricDataResults: [] });
    const { app } = await import("../app");

    const res = await app.request("/api/admin/health", { headers: ADMIN_HEADERS });

    expect(res.status).toBe(200);
  });
});
