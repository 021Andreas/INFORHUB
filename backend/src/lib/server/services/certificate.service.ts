import { eq } from "drizzle-orm";
import { db } from "$lib/server/db";
import { AppError, type Actor } from "$lib/server/errors";
import { certificates, events, notifications, registrations, users } from "$lib/server/db/schema";

const CODE_FORMAT = /^[a-f0-9]{32}$/;

/**
 * F-25: data minimum untuk halaman verifikasi publik. Sengaja TANPA email, NIM, ID internal,
 * maupun nomor urut. Pencarian memakai kode acak (bukan nomor sertifikat yang bisa ditebak).
 */
export async function getPublicVerification(code: string) {
  if (!CODE_FORMAT.test(code)) throw new AppError(404, "Sertifikat tidak ditemukan", "NOT_FOUND");
  const [row] = await db
    .select({
      status: certificates.status,
      certificateNumber: certificates.certificateNumber,
      issuedAt: certificates.issuedAt,
      revokedAt: certificates.revokedAt,
      participantName: users.name,
      eventTitle: events.title,
      eventStartAt: events.startAt,
      eventEndAt: events.endAt,
    })
    .from(certificates)
    .innerJoin(registrations, eq(registrations.id, certificates.registrationId))
    .innerJoin(users, eq(users.id, registrations.userId))
    .innerJoin(events, eq(events.id, registrations.eventId))
    .where(eq(certificates.verificationCode, code));
  if (!row) throw new AppError(404, "Sertifikat tidak ditemukan", "NOT_FOUND");

  return {
    valid: row.status === "valid",
    status: row.status,
    certificateNumber: row.certificateNumber,
    participantName: row.participantName,
    eventTitle: row.eventTitle,
    eventStartAt: row.eventStartAt,
    eventEndAt: row.eventEndAt,
    issuedAt: row.issuedAt,
    revokedAt: row.status === "revoked" ? row.revokedAt : null,
  };
}

/** Pencabutan oleh admin atau penyelenggara acara tsb. Verifikasi publik langsung menampilkan "dicabut". */
export async function revokeCertificate(actor: Actor, certificateId: number, reason: string) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ cert: certificates, event: events, userId: registrations.userId })
      .from(certificates)
      .innerJoin(registrations, eq(registrations.id, certificates.registrationId))
      .innerJoin(events, eq(events.id, registrations.eventId))
      .where(eq(certificates.id, certificateId))
      .for("update");
    if (!row) throw new AppError(404, "Sertifikat tidak ditemukan");
    if (actor.role !== "admin" && row.event.organizerId !== actor.id)
      throw new AppError(403, "Anda tidak berhak mencabut sertifikat ini");
    if (row.cert.status === "revoked") throw new AppError(409, "Sertifikat sudah dicabut");

    await tx
      .update(certificates)
      .set({ status: "revoked", revokedAt: new Date(), revokedReason: reason, revokedBy: actor.id })
      .where(eq(certificates.id, certificateId));
    await tx.insert(notifications).values({
      userId: row.userId,
      eventId: row.event.id,
      type: "certificate_revoked",
      message: `Sertifikat untuk "${row.event.title}" dicabut: ${reason}`,
    });
    return { ok: true, status: "revoked" as const };
  });
}