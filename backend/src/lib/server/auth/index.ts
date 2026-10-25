import { dev } from "$app/environment";
import { env } from "$env/dynamic/private";
import type { Cookies } from "@sveltejs/kit";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db } from "$lib/server/db";
import { users } from "$lib/server/db/schema";

export const SESSION_COOKIE = "session";
const SESSION_SECONDS = 60 * 60 * 24 * 7; // 7 hari

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: "mahasiswa" | "penyelenggara" | "admin";
};

function getSecret() {
  const secret = env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET belum diatur di .env atau kurang dari 32 karakter");
  }
  return new TextEncoder().encode(secret);
}

/* ---------------- password ---------------- */
// Hash palsu supaya waktu login tetap sama walau email tidak ditemukan
const DUMMY_HASH = bcrypt.hashSync("dummy-password", 12);

export const hashPassword = (plain: string) => bcrypt.hash(plain, 12);

export async function verifyPassword(plain: string, hash?: string | null) {
  const ok = await bcrypt.compare(plain, hash ?? DUMMY_HASH);
  return hash ? ok : false;
}

/* ---------------- sesi (cookie httpOnly berisi JWT) ---------------- */
// COOKIE_SAMESITE: "lax" (default, frontend & backend satu situs, mis. sama-sama localhost)
// atau "none" (frontend & backend beda domain di production; wajib HTTPS).
function cookieSameSite(): "lax" | "strict" | "none" {
  const v = env.COOKIE_SAMESITE;
  return v === "none" || v === "strict" ? v : "lax";
}

export async function startSession(cookies: Cookies, userId: number) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(getSecret());

  cookies.set(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: cookieSameSite(),
    secure: !dev || cookieSameSite() === "none",
    maxAge: SESSION_SECONDS,
  });
}

export function endSession(cookies: Cookies) {
  cookies.delete(SESSION_COOKIE, { path: "/" });
}

// Role dan status diambil dari database tiap request, jadi akun yang
// di-suspend atau diubah rolenya langsung berlaku tanpa menunggu token habis.
export async function getSessionUser(cookies: Cookies): Promise<SessionUser | null> {
  const token = cookies.get(SESSION_COOKIE);
  if (!token) return null;

  const secret = getSecret();
  let userId: number;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    userId = Number(payload.sub);
  } catch {
    return null; // token rusak / kedaluwarsa
  }
  if (!Number.isInteger(userId)) return null;

  const [u] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!u || u.status !== "active") return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}