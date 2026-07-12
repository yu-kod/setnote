import { Hono } from "hono";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLES } from "../db/client";
import { authMiddleware } from "../middleware/auth";
import { aggregateTrackUsage, type TrackUsageInput } from "../analytics/trackUsage";

export const analyticsRoute = new Hono();

// 自分のセットリスト横断で、曲ごとの使用回数を集計して返す（認証必須）。
analyticsRoute.get("/track-usage", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLES.setlists,
      IndexName: "gsi-userId",
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": userId },
    })
  );

  const setlists = (result.Items ?? []) as TrackUsageInput[];
  return c.json(aggregateTrackUsage(setlists));
});
