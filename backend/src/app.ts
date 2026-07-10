import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import setlistsRouter from "./routes/setlists";

export function createApp(options?: { corsOrigin?: string }) {
  const app = express();

  if (options?.corsOrigin) {
    app.use(cors({ origin: options.corsOrigin, credentials: true }));
  }

  app.use(express.json());
  app.use(cookieParser());

  app.use("/api/setlists", setlistsRouter);

  return app;
}
