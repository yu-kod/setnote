import { Hono } from "hono";
import { setlistsRoute } from "./routes/setlists";

export const app = new Hono();

app.route("/api/setlists", setlistsRoute);
