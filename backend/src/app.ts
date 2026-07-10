import { Hono } from "hono";
import { setlistsRoute } from "./routes/setlists";
import { authRoute } from "./routes/auth";

export const app = new Hono();

app.route("/api/auth", authRoute);
app.route("/api/setlists", setlistsRoute);
