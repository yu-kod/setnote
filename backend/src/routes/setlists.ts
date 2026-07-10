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

  return c.json(result.Item.publishedSnapshot);
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
          "SET #name = :name, tracks = :tracks, eventName = :eventName, eventLink = :eventLink, eventDate = :eventDate, updatedAt = :now",
        ConditionExpression: "attribute_exists(id) AND userId = :uid",
        ExpressionAttributeNames: { "#name": "name" },
        ExpressionAttributeValues: {
          ":name": body.name,
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
  const id = c.req.param("id");
  const userId = c.get("userId");

  const result = await docClient.send(
    new GetCommand({
      TableName: TABLES.setlists,
      Key: { id },
    })
  );

  if (!result.Item) {
    return c.json({ error: "Not found" }, 404);
  }

  if (result.Item.userId !== userId) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const { status: _status, publishedSnapshot: _snap, ...snapshot } = result.Item;

  const updated = await docClient.send(
    new UpdateCommand({
      TableName: TABLES.setlists,
      Key: { id },
      UpdateExpression: "SET #status = :published, publishedSnapshot = :snapshot, updatedAt = :now",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":published": "published",
        ":snapshot": snapshot,
        ":now": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW",
    })
  );

  return c.json(updated.Attributes);
});

setlistsRoute.delete("/:id/publish", authMiddleware, async (c) => {
  const userId = c.get("userId");

  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLES.setlists,
        Key: { id: c.req.param("id") },
        UpdateExpression: "SET #status = :unpublished, updatedAt = :now",
        ConditionExpression: "attribute_exists(id) AND userId = :uid",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":unpublished": "unpublished",
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
