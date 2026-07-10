import { Hono } from "hono";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLES } from "../db/client";

export const setlistsRoute = new Hono();

setlistsRoute.get("/:id", async (c) => {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLES.setlists,
        Key: { id: c.req.param("id") },
      })
    );

    if (!result.Item) {
      return c.json({ error: "Not found" }, 404);
    }

    if (result.Item.status !== "published") {
      return c.json({ error: "Not found" }, 404);
    }

    return c.json(result.Item.publishedSnapshot);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal server error" }, 500);
  }
});
