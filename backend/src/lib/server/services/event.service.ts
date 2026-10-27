// Simpan sebagai: src/lib/server/services/events.ts
// ASUMSI: `db` di-export dari "$lib/server/db". Sesuaikan jika berbeda.

import { randomBytes } from "node:crypto";
import { and, count, eq, isNull, like } from "drizzle-orm";
import { db } from "$lib/server/db";
import {
  events,
  eventCategories,
  registrations,
  attendance,
  certificates,
  notifications,
  users,
} from "$lib/server/db/schema";
import { isDuplicateError } from "$lib/server/db-errors";
import { registeredCount } from "./sql-helpers";

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
/* Filter opsional: kategori, kata kunci judul, paging.                */
/* ------------------------------------------------------------------ */
export async function listPublishedEvents(opts: {
  categoryId?: number;
  q?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;

  const where = and(
    eq(events.status, "published"),
    opts.categoryId ? eq(events.categoryId, opts.categoryId) : undefined,
    opts.q ? like(events.title, `%${opts.q}%`) : undefined,
  );

  const items = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      posterUrl: events.posterUrl,
      categoryId: events.categoryId,
      category: eventCategories.name,
      organizer: users.name,
      startAt: events.startAt,
      endAt: events.endAt,
      deadline: events.registrationDeadline,
      location: events.location,
      quota: events.quota,
      certificateAvailable: events.certificateAvailable,
      registered: registeredCount(),
    })
    .from(events)
    .leftJoin(eventCategories, eq(eventCategories.id, events.categoryId))
    .innerJoin(users, eq(users.id, events.organizerId))
    .where(where)
    .orderBy(events.startAt)
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db.select({ total: count() }).from(events).where(where);
  return { items, total, limit, offset };
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
    if (event.registrationDeadline && event.registrationDeadline < new Date())
      throw new AppError(400, "Pendaftaran sudah ditutup");

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
/* `render` membuat file PDF dan mengembalikan nama/path file-nya.     */
/* ------------------------------------------------------------------ */
export type CertificateData = {
  certificateNumber: string;
  participantName: string;
  eventTitle: string;
  eventStart: Date;
  eventEnd: Date;
  location: string;
};
export type CertificateStore = {
  /** Membuat dan menyimpan PDF; mengembalikan referensi (nama file / ID Google Drive). */
  save: (data: CertificateData) => Promise<string>;
  /** Membuang file; dipakai bila pencatatan ke database gagal. */
  remove: (ref: string) => Promise<void>;
};

/*
 * Urutan sengaja dibuat 3 tahap:
 *  1) validasi (hanya membaca)            -> tidak menahan koneksi/lock database
 *  2) buat + simpan file (bisa lambat: upload ke Google Drive) DI LUAR transaksi
 *  3) transaksi singkat: catat sertifikat + notifikasi
 * Jika tahap 3 gagal (termasuk dua permintaan serentak untuk peserta yang sama; unique index
 * pada registration_id menolak yang kedua), file yang sudah terunggah dibuang agar tidak yatim.
 */
export async function issueCertificate(actor: Actor, registrationId: number, store: CertificateStore) {
  const [row] = await db
    .select({
      reg: registrations,
      event: events,
      att: attendance,
      participantName: users.name,
    })
    .from(registrations)
    .innerJoin(events, eq(events.id, registrations.eventId))
    .innerJoin(users, eq(users.id, registrations.userId))
    .leftJoin(attendance, eq(attendance.registrationId, registrations.id))
    .where(eq(registrations.id, registrationId));

  if (!row) throw new AppError(404, "Pendaftaran tidak ditemukan");
  if (actor.role !== "admin" && row.event.organizerId !== actor.id)
    throw new AppError(403, "Anda tidak berhak menerbitkan sertifikat ini");
  if (!row.event.certificateAvailable)
    throw new AppError(400, "Acara ini tidak menyediakan sertifikat");
  if (row.event.status !== "completed") throw new AppError(400, "Acara belum selesai");
  if (row.reg.status !== "registered") throw new AppError(400, "Pendaftaran sudah dibatalkan");
  if (row.att?.status !== "present") throw new AppError(400, "Peserta tidak tercatat hadir");

  const [dup] = await db
    .select({ id: certificates.id })
    .from(certificates)
    .where(eq(certificates.registrationId, registrationId));
  if (dup) throw new AppError(409, "Sertifikat sudah diterbitkan");

  const certificateNumber = `CERT-${row.event.id}-${registrationId}-${new Date().getFullYear()}`;
  const ref = await store.save({
    certificateNumber,
    participantName: row.participantName,
    eventTitle: row.event.title,
    eventStart: row.event.startAt,
    eventEnd: row.event.endAt,
    location: row.event.location,
  });

  try {
    return await db.transaction(async (tx) => {
      const [res] = await tx.insert(certificates).values({
        registrationId,
        certificateNumber,
        filePath: ref,
        issuedBy: actor.id,
      });
      await tx.insert(notifications).values({
        userId: row.reg.userId,
        eventId: row.event.id,
        type: "certificate_issued",
        message: `Sertifikat untuk "${row.event.title}" sudah tersedia.`,
      });
      return { id: res.insertId, certificateNumber };
    });
  } catch (e) {
    await store
      .remove(ref)
      .catch((err) => console.error("Gagal membuang file sertifikat yatim:", ref, err));
    if (isDuplicateError(e)) throw new AppError(409, "Sertifikat sudah diterbitkan");
    throw e;
  }
}

// Terbitkan sertifikat untuk semua peserta yang hadir dan belum punya sertifikat.
// Diproses 4 sekaligus; ?limit= (opsional) membatasi jumlah per panggilan, `remaining` = sisanya.
export async function issueCertificatesForEvent(
  actor: Actor,
  eventId: number,
  store: CertificateStore,
  opts: { limit?: number } = {},
) {
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) throw new AppError(404, "Acara tidak ditemukan");
  if (actor.role !== "admin" && event.organizerId !== actor.id)
    throw new AppError(403, "Anda bukan penyelenggara acara ini");
  if (!event.certificateAvailable)
    throw new AppError(400, "Acara ini tidak menyediakan sertifikat");
  if (event.status !== "completed") throw new AppError(400, "Acara belum selesai");

  const pending = await db
    .select({ id: registrations.id })
    .from(registrations)
    .innerJoin(
      attendance,
      and(eq(attendance.registrationId, registrations.id), eq(attendance.status, "present")),
    )
    .leftJoin(certificates, eq(certificates.registrationId, registrations.id))
    .where(
      and(
        eq(registrations.eventId, eventId),
        eq(registrations.status, "registered"),
        isNull(certificates.id),
      ),
    );

  const batch = opts.limit ? pending.slice(0, opts.limit) : pending;
  let issued = 0;
  const failed: { registrationId: number; error: string }[] = [];

  let next = 0;
  const worker = async () => {
    while (next < batch.length) {
      const r = batch[next++];
      try {
        await issueCertificate(actor, r.id, store);
        issued++;
      } catch (e) {
        if (e instanceof AppError && e.status === 409) continue; // sudah terbit
        console.error("Gagal menerbitkan sertifikat", r.id, e);
        failed.push({
          registrationId: r.id,
          error: e instanceof AppError ? e.message : "Kesalahan server",
        });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, batch.length) }, worker));

  return { eligible: pending.length, issued, failed, remaining: pending.length - batch.length };
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