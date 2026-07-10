import { Hono } from "hono";
import { setlistsRoute } from "./routes/setlists";

export const app = new Hono();

app.get("/api/health", (c) => c.json({ status: "ok" }));

app.route("/api/setlists", setlistsRoute);
