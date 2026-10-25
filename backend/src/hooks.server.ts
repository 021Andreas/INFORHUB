import type { Handle } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { getSessionUser } from "$lib/server/auth";

// Daftar origin frontend yang diizinkan, dipisah koma. Contoh di .env:
// FRONTEND_ORIGIN=http://localhost:5173
const allowedOrigins = () =>
  (env.FRONTEND_ORIGIN ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !allowedOrigins().includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export const handle: Handle = async ({ event, resolve }) => {
  const isApi = event.url.pathname.startsWith("/api/");
  const cors = isApi ? corsHeaders(event.request.headers.get("origin")) : {};

  // Preflight dari browser
  if (isApi && event.request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  event.locals.user = await getSessionUser(event.cookies);

  const response = await resolve(event);
  for (const [key, value] of Object.entries(cors)) response.headers.set(key, value);
  return response;
};