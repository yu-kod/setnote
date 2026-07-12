import { Hono } from "hono";
import { setlistsRoute } from "./routes/setlists";
import { authRoute } from "./routes/auth";
import { analyticsRoute } from "./routes/analytics";
import { ogpRoute } from "./routes/ogp";
import { requestLogger } from "./middleware/logger";
import { errorHandler } from "./middleware/error";

export const app = new Hono();

app.use("*", requestLogger);
app.onError(errorHandler);

app.route("/api/auth", authRoute);
app.route("/api/setlists", setlistsRoute);
app.route("/api/analytics", analyticsRoute);
app.route("/api/ogp", ogpRoute);
