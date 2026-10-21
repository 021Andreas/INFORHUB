/// <reference types="node" />

import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const host = process.env.DB_HOST || "127.0.0.1";
const port = process.env.DB_PORT || "3306";
const user = process.env.DB_USER || "root";
const password = process.env.DB_PASSWORD || "";
const database = process.env.DB_NAME || "inforhub_db";

// kalau password kosong, jangan tulis ":" di URL
const auth = password
  ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}`
  : encodeURIComponent(user);

export default defineConfig({
  schema: "./src/lib/server/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: `mysql://${auth}@${host}:${port}/${database}`,
  },
});