import { Router } from "express";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLES } from "../db/client";

const router = Router();

router.get("/:id", async (req, res) => {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLES.setlists,
        Key: { id: req.params.id },
      })
    );

    if (!result.Item) {
      return res.status(404).json({ error: "Not found" });
    }

    const item = result.Item;
    if (item.status !== "published") {
      return res.status(404).json({ error: "Not found" });
    }

    res.json(item.publishedSnapshot);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
