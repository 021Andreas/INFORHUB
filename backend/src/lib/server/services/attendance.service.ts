import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { env } from "$env/dynamic/private";
import { db } from "$lib/server/db";
import { attendance, events, registrations } from "$lib/server/db/schema";
import { AppError, type Actor } from "./event.service";

const AUDIENCE = "attendance";
const TTL_SECONDS = 60;

// Kunci khusus QR, diturunkan dari rahasia yang berbeda dari token login, ditambah
// audience khusus. Token QR tidak akan pernah diterima sebagai token login (dan sebaliknya).
function qrKey() {
  const base = env.ATTENDANCE_SECRET ?? env.JWT_SECRET;
  if (!base || base.length < 32) {
    throw new Error("JWT_SECRET (atau ATTENDANCE_SECRET) belum diatur atau kurang dari 32 karakter");
  }
  return createHash("sha256").update(`${base}:attendance`).digest();
}

/** Token untuk QR yang ditampilkan penyelenggara. Berlaku 60 detik; frontend meminta yang baru berkala. */
export async function createAttendanceSession(actor: Actor, eventId: number) {
  const [event] = await db
    .select({ id: events.id, organizerId: events.organizerId, status: events.status })
    .from(events)
    .where(eq(events.id, eventId));
  if (!event) throw new AppError(404, "Acara tidak ditemukan");
  if (actor.role !== "admin" && event.organizerId !== actor.id)
    throw new AppError(403, "Anda bukan penyelenggara acara ini");
  if (event.status !== "published")
    throw new AppError(400, "Sesi absensi hanya bisa dibuka untuk acara yang sudah dipublikasikan");

  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const token = await new SignJWT({ eventId })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(qrKey());
  return { token, expiresAt: new Date(exp * 1000).toISOString() };
}

/** Peserta yang login memindai QR -> kehadiran tercatat (method 'qr'). */
export async function scanAttendance(userId: number, token: string) {
  let eventId: number;
  try {
    const { payload } = await jwtVerify(token, qrKey(), {
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });
    eventId = Number(payload.eventId);
  } catch {
    throw new AppError(400, "QR tidak valid atau sudah kedaluwarsa");
  }
  if (!Number.isInteger(eventId)) throw new AppError(400, "QR tidak valid atau sudah kedaluwarsa");

  return db.transaction(async (tx) => {
    const [reg] = await tx
      .select()
      .from(registrations)
      .where(and(eq(registrations.eventId, eventId), eq(registrations.userId, userId)))
      .for("update"); // kunci baris: dua scan bersamaan tidak bisa sama-sama lolos
    if (!reg || reg.status !== "registered")
      throw new AppError(404, "Anda tidak terdaftar pada acara ini");

    const [event] = await tx.select().from(events).where(eq(events.id, eventId));
    if (!event || event.status !== "published")
      throw new AppError(400, "Sesi absensi tidak aktif");

    const [att] = await tx.select().from(attendance).where(eq(attendance.registrationId, reg.id));
    if (att?.status === "present") throw new AppError(409, "Anda sudah tercatat hadir");

    const checkedAt = new Date();
    const values = { status: "present" as const, method: "qr" as const, checkedBy: userId, checkedAt };
    if (att) await tx.update(attendance).set(values).where(eq(attendance.id, att.id));
    else await tx.insert(attendance).values({ registrationId: reg.id, ...values });

    return { ok: true, event: { id: event.id, title: event.title }, checkedAt: checkedAt.toISOString() };
  });
}