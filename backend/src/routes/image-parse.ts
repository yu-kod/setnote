import { Hono } from "hono";
import { z } from "zod/v4";
import { authMiddleware } from "../middleware/auth";
import { parseTracksFromImage } from "../services/image-parser";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const VALID_MEDIA_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
type MediaType = (typeof VALID_MEDIA_TYPES)[number];

const requestSchema = z.object({
  image: z.string().min(1),
  mediaType: z.enum(VALID_MEDIA_TYPES),
});

export const imageParseRoute = new Hono();

imageParseRoute.post("/", authMiddleware, async (c) => {
  const body = await c.req.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: "image and valid mediaType are required" } },
      400
    );
  }

  if (parsed.data.image.length > MAX_IMAGE_SIZE) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Image must be under 5MB" } }, 400);
  }

  const tracks = await parseTracksFromImage(parsed.data.image, parsed.data.mediaType as MediaType);

  return c.json({ tracks });
});
