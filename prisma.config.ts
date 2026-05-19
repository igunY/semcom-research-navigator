import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // db push / migrate needs a direct (non-pgbouncer) connection
    url: process.env["POSTGRES_URL_NON_POOLING"] ?? process.env["DATABASE_URL"],
  },
});
