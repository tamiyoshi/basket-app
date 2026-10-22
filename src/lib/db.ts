import "server-only";

import postgres from "postgres";

declare global {
  // Keep one connection pool during Next.js development hot reloads.
  // eslint-disable-next-line no-var
  var basketDatabase: ReturnType<typeof postgres> | undefined;
}

export function getDb() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL が設定されていません");
  }

  if (!globalThis.basketDatabase) {
    globalThis.basketDatabase = postgres(connectionString, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      ssl: process.env.NODE_ENV === "production" ? "require" : undefined,
    });
  }

  return globalThis.basketDatabase;
}
