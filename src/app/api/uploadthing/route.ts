import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";
import { env } from "@/lib/env";

process.env.UPLOADTHING_TOKEN = env("UPLOADTHING_TOKEN");

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
