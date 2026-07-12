import { Hono } from "hono";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLES } from "../db/client";

const SITE_URL = "https://setnote.yu-web.site";
const OG_IMAGE = `${SITE_URL}/og-image.png`;

export const ogpRoute = new Hono();

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildDescription(item: {
  artistName?: string;
  eventName?: string;
  tracks?: unknown[];
}): string {
  const parts: string[] = [];
  if (item.artistName) parts.push(item.artistName);
  if (item.eventName) parts.push(item.eventName);
  const trackCount = item.tracks?.length ?? 0;
  parts.push(`${trackCount}曲`);
  return parts.join(" | ");
}

ogpRoute.get("/:id", async (c) => {
  const id = c.req.param("id");
  const result = await docClient.send(
    new GetCommand({ TableName: TABLES.setlists, Key: { id } }),
  );

  if (!result.Item || result.Item.status !== "published") {
    return c.json({ error: "Not found" }, 404);
  }

  const item = result.Item;
  const title = escapeHtml(item.name ?? "");
  const description = escapeHtml(buildDescription(item));
  const url = `${SITE_URL}/s/${id}`;

  const html = `<!DOCTYPE html>
<html prefix="og: https://ogp.me/ns#">
<head>
<meta charset="UTF-8" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${OG_IMAGE}" />
<meta property="og:site_name" content="setnote" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${OG_IMAGE}" />
<title>${title} - setnote</title>
<meta http-equiv="refresh" content="0;url=${url}" />
</head>
<body></body>
</html>`;

  return c.html(html);
});
