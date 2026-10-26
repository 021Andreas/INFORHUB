import { json } from "@sveltejs/kit";
import { sql } from "drizzle-orm";
import { db } from "$lib/server/db";
import type { RequestHandler } from "./$types";

// Cek kesehatan: server hidup + database bisa dihubungi
export const GET: RequestHandler = async () => {
  try {
    await db.execute(sql`select 1`);
    return json({ status: "ok", db: "up", time: new Date().toISOString() });
  } catch (e) {
    console.error("Health check gagal:", e);
    return json({ status: "error", db: "down", time: new Date().toISOString() }, { status: 503 });
  }
};