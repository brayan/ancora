import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getDatabaseUrl } from "@/server/env";
import * as schema from "@/server/db/schema";

const globalForDatabase = globalThis as typeof globalThis & {
  ancoraDatabasePool?: Pool;
};

const pool =
  globalForDatabase.ancoraDatabasePool ??
  new Pool({
    connectionString: getDatabaseUrl(),
  });

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.ancoraDatabasePool = pool;
}

export const db = drizzle(pool, { schema });
