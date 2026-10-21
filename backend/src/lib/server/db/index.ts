
import { env } from "$env/dynamic/private";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema";

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD ?? "",
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

export const db = drizzle(pool, {
  schema,
  mode: "default",
});
