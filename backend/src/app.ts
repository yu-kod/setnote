import { Hono } from "hono";
import { setlistsRoute } from "./routes/setlists";
import { authRoute } from "./routes/auth";

export const app = new Hono();

app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, 500);
});

app.route("/api/auth", authRoute);
app.route("/api/setlists", setlistsRoute);
