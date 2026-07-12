import { Hono } from "hono";
import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, TABLES } from "../db/client";
import { nanoid } from "nanoid";
import { authMiddleware } from "../middleware/auth";

export const setlistsRoute = new Hono();

// --- Protected routes (auth required) ---
// Literal paths must be registered before parameterized /:id

setlistsRoute.get("/mine", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLES.setlists,
      IndexName: "gsi-userId",
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": userId },
    })
  );
  return c.json(result.Items ?? []);
});

// --- Public routes (no auth) ---

setlistsRoute.get("/:id", async (c) => {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLES.setlists,
      Key: { id: c.req.param("id") },
    })
  );

  if (!result.Item || result.Item.status !== "published") {
    return c.json({ error: "Not found" }, 404);
  }

  // 公開スナップショットは廃止。公開中なら保存済みの最新データをそのまま返す。
  return c.json(result.Item);
});

// 公開ページ表示のPVビーコン（認証不要）。公開中のときだけ viewCount を +1 する。
// 未公開・存在しないIDは黙って無視し、常に 204 を返す（fire-and-forget）。
setlistsRoute.post("/:id/view", async (c) => {
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLES.setlists,
        Key: { id: c.req.param("id") },
        UpdateExpression: "ADD viewCount :one",
        ConditionExpression: "attribute_exists(id) AND #status = :published",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":one": 1, ":published": "published" },
      })
    );
  } catch (err) {
    if ((err as Error).name !== "ConditionalCheckFailedException") {
      throw err;
    }
  }
  return c.body(null, 204);
});

// 公開ページからの曲いいね（認証不要）。公開中のときだけ likeCounts[trackId] を +1 する。
// 未認証ユーザー向けで、厳密な重複防止はしない（1人1回はフロントの localStorage で緩く担保）。
async function addLike(id: string, trackId: string): Promise<number> {
  const res = await docClient.send(
    new UpdateCommand({
      TableName: TABLES.setlists,
      Key: { id },
      UpdateExpression: "SET likeCounts.#tid = if_not_exists(likeCounts.#tid, :zero) + :one",
      ConditionExpression: "attribute_exists(id) AND #status = :published",
      ExpressionAttributeNames: { "#tid": trackId, "#status": "status" },
      ExpressionAttributeValues: { ":zero": 0, ":one": 1, ":published": "published" },
      ReturnValues: "UPDATED_NEW",
    })
  );
  return (res.Attributes?.likeCounts?.[trackId] as number | undefined) ?? 1;
}

setlistsRoute.post("/:id/tracks/:trackId/like", async (c) => {
  const id = c.req.param("id");
  const trackId = c.req.param("trackId");

  try {
    try {
      return c.json({ likeCount: await addLike(id, trackId) });
    } catch (err) {
      // likeCounts マップが未作成の既存セットリストは ValidationException になる。
      // マップを初期化してから再試行する。
      if ((err as Error).name !== "ValidationException") throw err;
      await docClient.send(
        new UpdateCommand({
          TableName: TABLES.setlists,
          Key: { id },
          UpdateExpression: "SET likeCounts = if_not_exists(likeCounts, :empty)",
          ConditionExpression: "attribute_exists(id)",
          ExpressionAttributeValues: { ":empty": {} },
        })
      );
      return c.json({ likeCount: await addLike(id, trackId) });
    }
  } catch (err) {
    if ((err as Error).name === "ConditionalCheckFailedException") {
      return c.json({ error: "Not found" }, 404);
    }
    throw err;
  }
});

// 公開ページからの曲いいね取り消し（認証不要）。公開中かつ 1 以上のときだけ -1 する。
// 減らすものが無い（0・マップ未作成・未公開）場合は 0 を返し、取り消しは冪等に扱う。
setlistsRoute.delete("/:id/tracks/:trackId/like", async (c) => {
  const id = c.req.param("id");
  const trackId = c.req.param("trackId");

  try {
    const res = await docClient.send(
      new UpdateCommand({
        TableName: TABLES.setlists,
        Key: { id },
        UpdateExpression: "SET likeCounts.#tid = likeCounts.#tid - :one",
        ConditionExpression:
          "attribute_exists(id) AND #status = :published AND likeCounts.#tid > :zero",
        ExpressionAttributeNames: { "#tid": trackId, "#status": "status" },
        ExpressionAttributeValues: { ":one": 1, ":zero": 0, ":published": "published" },
        ReturnValues: "UPDATED_NEW",
      })
    );
    return c.json({
      likeCount: (res.Attributes?.likeCounts?.[trackId] as number | undefined) ?? 0,
    });
  } catch (err) {
    const name = (err as Error).name;
    if (name === "ConditionalCheckFailedException" || name === "ValidationException") {
      return c.json({ likeCount: 0 });
    }
    throw err;
  }
});

setlistsRoute.post("/", authMiddleware, async (c) => {
  const body = await c.req.json();
  const userId = c.get("userId");

  if (!body.name) {
    return c.json({ error: "name is required" }, 400);
  }

  const now = new Date().toISOString();
  const item = {
    id: nanoid(10),
    userId,
    name: body.name,
    eventName: body.eventName ?? null,
    eventLink: body.eventLink ?? null,
    eventDate: body.eventDate ?? null,
    tracks: body.tracks ?? [],
    status: "draft",
    likeCounts: {},
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLES.setlists,
      Item: item,
    })
  );

  return c.json(item, 201);
});

setlistsRoute.put("/:id", authMiddleware, async (c) => {
  const body = await c.req.json();
  const id = c.req.param("id");
  const userId = c.get("userId");

  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLES.setlists,
        Key: { id },
        UpdateExpression:
          "SET #name = :name, artistName = :artistName, tracks = :tracks, eventName = :eventName, eventLink = :eventLink, eventDate = :eventDate, updatedAt = :now",
        ConditionExpression: "attribute_exists(id) AND userId = :uid",
        ExpressionAttributeNames: { "#name": "name" },
        ExpressionAttributeValues: {
          ":name": body.name,
          ":artistName": body.artistName ?? null,
          ":tracks": body.tracks ?? [],
          ":eventName": body.eventName ?? null,
          ":eventLink": body.eventLink ?? null,
          ":eventDate": body.eventDate ?? null,
          ":now": new Date().toISOString(),
          ":uid": userId,
        },
        ReturnValues: "ALL_NEW",
      })
    );
    return c.json(result.Attributes);
  } catch (err) {
    if ((err as Error).name === "ConditionalCheckFailedException") {
      return c.json({ error: "Not found" }, 404);
    }
    throw err;
  }
});

setlistsRoute.delete("/:id", authMiddleware, async (c) => {
  const userId = c.get("userId");

  try {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLES.setlists,
        Key: { id: c.req.param("id") },
        ConditionExpression: "attribute_exists(id) AND userId = :uid",
        ExpressionAttributeValues: { ":uid": userId },
      })
    );
    return c.body(null, 204);
  } catch (err) {
    if ((err as Error).name === "ConditionalCheckFailedException") {
      return c.json({ error: "Not found" }, 404);
    }
    throw err;
  }
});

setlistsRoute.post("/:id/publish", authMiddleware, async (c) => {
  const userId = c.get("userId");

  try {
    // 公開は「表示可能」にするだけ。スナップショットは作らず、保存済みの最新データが公開される。
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLES.setlists,
        Key: { id: c.req.param("id") },
        UpdateExpression: "SET #status = :published, updatedAt = :now",
        ConditionExpression: "attribute_exists(id) AND userId = :uid",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":published": "published",
          ":now": new Date().toISOString(),
          ":uid": userId,
        },
        ReturnValues: "ALL_NEW",
      })
    );
    return c.json(result.Attributes);
  } catch (err) {
    if ((err as Error).name === "ConditionalCheckFailedException") {
      return c.json({ error: "Not found" }, 404);
    }
    throw err;
  }
});

setlistsRoute.delete("/:id/publish", authMiddleware, async (c) => {
  const userId = c.get("userId");

  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLES.setlists,
        Key: { id: c.req.param("id") },
        // 非公開化は下書きに戻す（"unpublished" という別状態は持たない）。
        UpdateExpression: "SET #status = :draft, updatedAt = :now",
        ConditionExpression: "attribute_exists(id) AND userId = :uid",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":draft": "draft",
          ":now": new Date().toISOString(),
          ":uid": userId,
        },
        ReturnValues: "ALL_NEW",
      })
    );
    return c.json(result.Attributes);
  } catch (err) {
    if ((err as Error).name === "ConditionalCheckFailedException") {
      return c.json({ error: "Not found" }, 404);
    }
    throw err;
  }
});
