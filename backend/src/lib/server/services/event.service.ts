// Simpan sebagai: src/lib/server/services/events.ts
// ASUMSI: `db` di-export dari "$lib/server/db". Sesuaikan jika berbeda.

import { randomBytes } from "node:crypto";
import { and, count, eq, sql } from "drizzle-orm";
import { db } from "$lib/server/db";
import {
  events,
  registrations,
  attendance,
  certificates,
  notifications,
} from "$lib/server/db/schema";

/* ------------------------------------------------------------------ */
/* Tipe & error                                                        */
/* ------------------------------------------------------------------ */
export type Actor = { id: number; role: "mahasiswa" | "penyelenggara" | "admin" };

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const newTicketCode = () => randomBytes(16).toString("hex"); // 32 karakter

/* ------------------------------------------------------------------ */
/* 1. Daftar acara untuk homepage: "registered" dihitung, bukan simpan */
/* ------------------------------------------------------------------ */
export async function listPublishedEvents() {
  return db
    .select({
      id: events.id,
      title: events.title,
      posterUrl: events.posterUrl,
      categoryId: events.categoryId,
      startAt: events.startAt,
      location: events.location,
      quota: events.quota,
      registered: sql<number>`(
        select count(*) from ${registrations}
        where ${registrations.eventId} = ${events.id}
          and ${registrations.status} = 'registered'
      )`.mapWith(Number),
    })
    .from(events)
    .where(eq(events.status, "published"));
}

/* ------------------------------------------------------------------ */
/* 2. Pendaftaran: kuota aman + tidak ada pendaftaran ganda            */
/* Baris event dikunci (FOR UPDATE) sehingga pendaftaran ke event yang */
/* sama berjalan satu per satu dan kuota tidak bisa terlampaui.        */
/* ------------------------------------------------------------------ */
export async function registerForEvent(userId: number, eventId: number) {
  return db.transaction(async (tx) => {
    const [event] = await tx
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .for("update");

    if (!event || event.status !== "published")
      throw new AppError(404, "Acara tidak ditemukan atau belum dibuka");
    if (event.endAt <= new Date())
      throw new AppError(400, "Acara sudah selesai");

    const [existing] = await tx
      .select()
      .from(registrations)
      .where(
        and(eq(registrations.eventId, eventId), eq(registrations.userId, userId)),
      );

    if (existing?.status === "registered")
      throw new AppError(409, "Anda sudah terdaftar di acara ini");

    const [{ total }] = await tx
      .select({ total: count() })
      .from(registrations)
      .where(
        and(
          eq(registrations.eventId, eventId),
          eq(registrations.status, "registered"),
        ),
      );
    if (total >= event.quota) throw new AppError(409, "Kuota acara sudah penuh");

    const ticketCode = newTicketCode();

    if (existing) {
      // Pernah batal -> aktifkan lagi (unique index melarang INSERT baru)
      await tx
        .update(registrations)
        .set({
          status: "registered",
          ticketCode,
          cancelledAt: null,
          registeredAt: new Date(),
        })
        .where(eq(registrations.id, existing.id));
    } else {
      await tx.insert(registrations).values({ eventId, userId, ticketCode });
    }

    await tx.insert(notifications).values({
      userId,
      eventId,
      type: "registration_success",
      message: `Pendaftaran berhasil untuk acara "${event.title}".`,
    });

    return { ticketCode };
  });
}

export async function cancelRegistration(userId: number, eventId: number) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ reg: registrations, event: events })
      .from(registrations)
      .innerJoin(events, eq(events.id, registrations.eventId))
      .where(
        and(eq(registrations.eventId, eventId), eq(registrations.userId, userId)),
      );

    if (!row || row.reg.status !== "registered")
      throw new AppError(404, "Pendaftaran aktif tidak ditemukan");
    if (row.event.startAt <= new Date())
      throw new AppError(400, "Acara sudah dimulai, pendaftaran tidak bisa dibatalkan");

    await tx
      .update(registrations)
      .set({ status: "cancelled", cancelledAt: new Date() })
      .where(eq(registrations.id, row.reg.id));

    await tx.insert(notifications).values({
      userId,
      eventId,
      type: "registration_cancelled",
      message: `Pendaftaran Anda untuk "${row.event.title}" dibatalkan.`,
    });
  });
}

/* ------------------------------------------------------------------ */
/* 3. Alur status acara                                                */
/* draft -> pending -> published | rejected ; rejected -> draft ;      */
/* published -> completed                                              */
/* ------------------------------------------------------------------ */
type EventStatus = (typeof events.$inferSelect)["status"];
type Rule = { to: EventStatus; by: "owner" | "admin" | "owner_or_admin" };

const TRANSITIONS: Record<EventStatus, Rule[]> = {
  draft: [{ to: "pending", by: "owner_or_admin" }],
  pending: [
    { to: "published", by: "admin" },
    { to: "rejected", by: "admin" },
  ],
  rejected: [{ to: "draft", by: "owner_or_admin" }],
  published: [{ to: "completed", by: "owner_or_admin" }],
  completed: [],
};

export async function changeEventStatus(
  actor: Actor,
  eventId: number,
  to: EventStatus,
  reason?: string,
) {
  return db.transaction(async (tx) => {
    const [event] = await tx
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .for("update");
    if (!event) throw new AppError(404, "Acara tidak ditemukan");

    const rule = TRANSITIONS[event.status].find((r) => r.to === to);
    if (!rule)
      throw new AppError(400, `Status tidak bisa diubah dari ${event.status} ke ${to}`);

    const isAdmin = actor.role === "admin";
    const isOwner = event.organizerId === actor.id;
    const allowed =
      rule.by === "admin" ? isAdmin : rule.by === "owner" ? isOwner : isAdmin || isOwner;
    if (!allowed) throw new AppError(403, "Anda tidak berhak mengubah status ini");

    if (to === "rejected" && !reason?.trim())
      throw new AppError(400, "Alasan penolakan wajib diisi");

    const set: Partial<typeof events.$inferInsert> = { status: to };
    if (to === "published") {
      Object.assign(set, {
        reviewedBy: actor.id,
        reviewedAt: new Date(),
        publishedAt: new Date(),
        rejectionReason: null,
      });
    } else if (to === "rejected") {
      Object.assign(set, {
        reviewedBy: actor.id,
        reviewedAt: new Date(),
        rejectionReason: reason!.trim(),
      });
    }
    await tx.update(events).set(set).where(eq(events.id, eventId));

    if (to === "published" || to === "rejected") {
      await tx.insert(notifications).values({
        userId: event.organizerId,
        eventId,
        type: to === "published" ? "event_approved" : "event_rejected",
        message:
          to === "published"
            ? `Acara "${event.title}" disetujui dan dipublikasikan.`
            : `Acara "${event.title}" ditolak: ${reason!.trim()}`,
      });
    }
  });
}

/* ------------------------------------------------------------------ */
/* 4. Check-in: hanya penyelenggara acara tsb atau admin, via QR       */
/* ------------------------------------------------------------------ */
export async function checkIn(
  actor: Actor,
  ticketCode: string,
  method: "qr" | "manual" = "qr",
) {
  const [row] = await db
    .select({ reg: registrations, event: events })
    .from(registrations)
    .innerJoin(events, eq(events.id, registrations.eventId))
    .where(eq(registrations.ticketCode, ticketCode));

  if (!row || row.reg.status !== "registered")
    throw new AppError(404, "Tiket tidak valid");
  if (actor.role !== "admin" && row.event.organizerId !== actor.id)
    throw new AppError(403, "Anda bukan penyelenggara acara ini");
  if (row.event.status !== "published")
    throw new AppError(400, "Acara tidak sedang berlangsung");

  const [att] = await db
    .select()
    .from(attendance)
    .where(eq(attendance.registrationId, row.reg.id));
  if (att?.status === "present") throw new AppError(409, "Peserta sudah check-in");

  const values = {
    status: "present" as const,
    method,
    checkedBy: actor.id,
    checkedAt: new Date(),
  };
  if (att) {
    await db.update(attendance).set(values).where(eq(attendance.id, att.id));
  } else {
    await db.insert(attendance).values({ registrationId: row.reg.id, ...values });
  }
  return { registrationId: row.reg.id, userId: row.reg.userId };
}

/* ------------------------------------------------------------------ */
/* 5. Sertifikat                                                       */
/* Terbit jika: certificateAvailable, event completed, hadir (present) */
/* filePath diisi setelah PDF dibuat (generator PDF menyusul).         */
/* ------------------------------------------------------------------ */
export async function issueCertificate(
  actor: Actor,
  registrationId: number,
  filePath: string,
) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ reg: registrations, event: events, att: attendance })
      .from(registrations)
      .innerJoin(events, eq(events.id, registrations.eventId))
      .leftJoin(attendance, eq(attendance.registrationId, registrations.id))
      .where(eq(registrations.id, registrationId));

    if (!row) throw new AppError(404, "Pendaftaran tidak ditemukan");
    if (actor.role !== "admin" && row.event.organizerId !== actor.id)
      throw new AppError(403, "Anda tidak berhak menerbitkan sertifikat ini");
    if (!row.event.certificateAvailable)
      throw new AppError(400, "Acara ini tidak menyediakan sertifikat");
    if (row.event.status !== "completed")
      throw new AppError(400, "Acara belum selesai");
    if (row.att?.status !== "present")
      throw new AppError(400, "Peserta tidak tercatat hadir");

    const [dup] = await tx
      .select({ id: certificates.id })
      .from(certificates)
      .where(eq(certificates.registrationId, registrationId));
    if (dup) throw new AppError(409, "Sertifikat sudah diterbitkan");

    const certificateNumber = `CERT-${row.event.id}-${registrationId}-${new Date().getFullYear()}`;
    await tx.insert(certificates).values({
      registrationId,
      certificateNumber,
      filePath,
      issuedBy: actor.id,
    });
    await tx.insert(notifications).values({
      userId: row.reg.userId,
      eventId: row.event.id,
      type: "certificate_issued",
      message: `Sertifikat untuk "${row.event.title}" sudah tersedia.`,
    });
    return { certificateNumber };
  });
}

// Unduh: pemilik sertifikat, penyelenggara acara, atau admin
export async function getCertificateForDownload(actor: Actor, certificateId: number) {
  const [row] = await db
    .select({ cert: certificates, reg: registrations, event: events })
    .from(certificates)
    .innerJoin(registrations, eq(registrations.id, certificates.registrationId))
    .innerJoin(events, eq(events.id, registrations.eventId))
    .where(eq(certificates.id, certificateId));

  if (!row) throw new AppError(404, "Sertifikat tidak ditemukan");
  const allowed =
    actor.role === "admin" ||
    row.reg.userId === actor.id ||
    row.event.organizerId === actor.id;
  if (!allowed) throw new AppError(403, "Anda tidak berhak mengunduh sertifikat ini");
  return row.cert;
}