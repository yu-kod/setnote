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

export const setlistsRoute = new Hono();

setlistsRoute.get("/user/:userId", async (c) => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLES.setlists,
      IndexName: "gsi-userId",
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": c.req.param("userId") },
    })
  );
  return c.json(result.Items ?? []);
});

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

setlistsRoute.post("/", async (c) => {
  const body = await c.req.json();

  if (!body.name || !body.userId) {
    return c.json({ error: "name and userId are required" }, 400);
  }

  const now = new Date().toISOString();
  const item = {
    id: nanoid(10),
    userId: body.userId,
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

setlistsRoute.put("/:id", async (c) => {
  const body = await c.req.json();
  const id = c.req.param("id");

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
          ":uid": body.userId,
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

setlistsRoute.delete("/:id", async (c) => {
  const body = await c.req.json();

  try {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLES.setlists,
        Key: { id: c.req.param("id") },
        ConditionExpression: "attribute_exists(id) AND userId = :uid",
        ExpressionAttributeValues: { ":uid": body.userId },
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

setlistsRoute.post("/:id/publish", async (c) => {
  const body = await c.req.json();
  const id = c.req.param("id");

  const result = await docClient.send(
    new GetCommand({
      TableName: TABLES.setlists,
      Key: { id },
    })
  );

  if (!result.Item) {
    return c.json({ error: "Not found" }, 404);
  }

  if (result.Item.userId !== body.userId) {
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

setlistsRoute.delete("/:id/publish", async (c) => {
  const body = await c.req.json();

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
          ":uid": body.userId,
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
