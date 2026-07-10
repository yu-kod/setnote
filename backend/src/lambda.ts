import serverlessExpress from "@codegenie/serverless-express";
import { createApp } from "./app";

const app = createApp();
const serverlessExpressInstance = serverlessExpress({ app });

export const handler = async (event: unknown, context: unknown) => {
  return serverlessExpressInstance(event, context);
};
