import { Hono } from "hono";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLES } from "../db/client";
import { authMiddleware } from "../middleware/auth";
import { aggregateTrackUsage, type TrackUsageInput } from "../analytics/trackUsage";
import { toViewRows, type ViewRowInput } from "../analytics/views";
import { aggregateLikes, type LikesInput } from "../analytics/likes";

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

// 自分のセットリストごとの表示回数(PV)一覧を返す（認証必須）。
analyticsRoute.get("/views", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLES.setlists,
      IndexName: "gsi-userId",
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": userId },
    })
  );

  const setlists = (result.Items ?? []) as ViewRowInput[];
  return c.json(toViewRows(setlists));
});

// 自分のセットリスト横断で、曲ごとのいいね数を集計して返す（認証必須）。
analyticsRoute.get("/likes", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLES.setlists,
      IndexName: "gsi-userId",
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": userId },
    })
  );

  const setlists = (result.Items ?? []) as LikesInput[];
  return c.json(aggregateLikes(setlists));
});
