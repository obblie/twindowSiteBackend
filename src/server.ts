import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";

app.listen(env.PORT, () => {
  logger.info("Server listening", {
    port: env.PORT,
    env: env.NODE_ENV
  });
});

