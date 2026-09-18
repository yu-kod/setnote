import { Hono } from "hono";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  type UserType,
} from "@aws-sdk/client-cognito-identity-provider";
import { CloudWatchClient, GetMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import { docClient, TABLES } from "../db/client";
import { authMiddleware } from "../middleware/auth";
import { adminMiddleware } from "../middleware/admin";
import { aggregateUsers } from "../admin/users";
import { aggregateContent, type SetlistInput } from "../admin/content";
import { summarizeHealth } from "../admin/health";

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "ap-northeast-1",
});

const cloudWatchClient = new CloudWatchClient({
  region: process.env.AWS_REGION || "ap-northeast-1",
});

/** 死活メトリクスを見る期間。 */
const HEALTH_WINDOW_MS = 24 * 60 * 60 * 1000;
/** メトリクスの集計間隔（秒）。24時間を1時間刻みで見る。 */
const HEALTH_PERIOD_SEC = 60 * 60;

export const adminRoute = new Hono();

// 管理者専用。認証 → 管理者グループの順にゲートする。
adminRoute.use("/*", authMiddleware, adminMiddleware);

// Cognito のユーザー全件から利用者数の合計と推移を返す。
adminRoute.get("/users", async (c) => {
  const users: UserType[] = [];
  let paginationToken: string | undefined;

  do {
    const page = await cognitoClient.send(
      new ListUsersCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID || "",
        Limit: 60,
        PaginationToken: paginationToken,
      })
    );
    users.push(...(page.Users ?? []));
    paginationToken = page.PaginationToken;
  } while (paginationToken);

  return c.json(aggregateUsers(users, new Date()));
});

// セットリスト全件からコンテンツ統計を返す。
// Scan を使うのは管理画面の全体集計だけで、ユーザー向けのリクエストパスには入れない。
adminRoute.get("/content", async (c) => {
  const items: SetlistInput[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const page = await docClient.send(
      new ScanCommand({
        TableName: TABLES.setlists,
        ExclusiveStartKey: lastKey,
      })
    );
    items.push(...((page.Items ?? []) as SetlistInput[]));
    lastKey = page.LastEvaluatedKey;
  } while (lastKey);

  return c.json(aggregateContent(items));
});

function lambdaMetric(id: string, metricName: string, stat: string) {
  return {
    Id: id,
    MetricStat: {
      Metric: {
        Namespace: "AWS/Lambda",
        MetricName: metricName,
        Dimensions: [
          { Name: "FunctionName", Value: process.env.AWS_LAMBDA_FUNCTION_NAME || "setnote-api" },
        ],
      },
      Period: HEALTH_PERIOD_SEC,
      Stat: stat,
    },
  };
}

function apiGatewayMetric(id: string, metricName: string, stat: string) {
  return {
    Id: id,
    MetricStat: {
      Metric: {
        Namespace: "AWS/ApiGateway",
        MetricName: metricName,
        Dimensions: [{ Name: "ApiId", Value: process.env.API_GATEWAY_ID || "" }],
      },
      Period: HEALTH_PERIOD_SEC,
      Stat: stat,
    },
  };
}

// CloudWatch の Lambda / API Gateway メトリクスから死活サマリを返す。
adminRoute.get("/health", async (c) => {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - HEALTH_WINDOW_MS);

  const result = await cloudWatchClient.send(
    new GetMetricDataCommand({
      StartTime: startTime,
      EndTime: endTime,
      MetricDataQueries: [
        lambdaMetric("invocations", "Invocations", "Sum"),
        lambdaMetric("errors", "Errors", "Sum"),
        lambdaMetric("throttles", "Throttles", "Sum"),
        lambdaMetric("duration", "Duration", "Average"),
        apiGatewayMetric("apiRequests", "Count", "Sum"),
        apiGatewayMetric("api5xx", "5xx", "Sum"),
      ],
    })
  );

  return c.json(summarizeHealth(result.MetricDataResults ?? []));
});
