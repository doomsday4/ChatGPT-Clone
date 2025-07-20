import type { Config } from "drizzle-kit";
import "dotenv/config";
import { parse } from "pg-connection-string";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in environment variables.");
}

const parsed = parse(process.env.DATABASE_URL);

if (!parsed.host || !parsed.user || !parsed.password || !parsed.database || !parsed.port) {
  console.error("Invalid DATABASE_URL parsed output:", parsed);
  throw new Error("Some required database credentials are missing in DATABASE_URL.");
}

export default {
  schema: "./src/server/db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    host: parsed.host,
    port: parseInt(parsed.port),
    user: parsed.user,
    password: parsed.password,
    database: parsed.database,
    ssl: {
      rejectUnauthorized: false,
    },
  },
} satisfies Config;
