import { and, count, eq } from "drizzle-orm";
import { db } from "$lib/server/db";
import { eventCategories, events, notifications, registrations } from "$lib/server/db/schema";
import { AppError, type Actor } from "./event.service";

export type EventInput = {
  title: string;
  description?: string | null;
  posterUrl?: string | null;
  categoryId?: number | null;
  startAt: Date;
  endAt: Date;
  location: string;
  quota: number;
  certificateAvailable?: boolean;
  deadline?: Date | null;
};

async function assertCategory(id: number | null | undefined) {
  if (!id) return;
  const [cat] = await db
    .select({ id: eventCategories.id })
    .from(eventCategories)
    .where(eq(eventCategories.id, id));
  if (!cat) throw new AppError(400, "Kategori tidak ditemukan");
}

function assertDates(d: { startAt: Date; endAt: Date; deadline?: Date | null }) {
  if (d.endAt <= d.startAt) throw new AppError(400, "Waktu selesai harus setelah waktu mulai");
  if (d.deadline && d.deadline > d.startAt)
    throw new AppError(400, "Batas pendaftaran tidak boleh melewati waktu mulai acara");
}

/** Status awal: draft / pending (diajukan). 'published' langsung hanya untuk admin. */
export async function createEvent(
  actor: Actor,
  input: EventInput,
  status: "draft" | "pending" | "published",
) {
  if (status === "published" && actor.role !== "admin")
    throw new AppError(403, "Hanya admin yang boleh langsung mempublikasikan acara");
  assertDates(input);
  await assertCategory(input.categoryId);

  const now = new Date();
  const [res] = await db.insert(events).values({
    title: input.title,
    description: input.description ?? null,
    posterUrl: input.posterUrl ?? null,
    categoryId: input.categoryId ?? null,
    organizerId: actor.id,
    startAt: input.startAt,
    endAt: input.endAt,
    location: input.location,
    quota: input.quota,
    certificateAvailable: input.certificateAvailable ?? false,
    registrationDeadline: input.deadline ?? null,
    status,
    ...(status === "published" ? { reviewedBy: actor.id, reviewedAt: now, publishedAt: now } : {}),
  });
  return { id: res.insertId, status };
}

/**
 * Aturan edit:
 *  - hanya pemilik atau admin
 *  - 'completed' terkunci; 'pending' (sedang ditinjau) terkunci untuk penyelenggara
 *  - kuota tidak boleh lebih kecil dari jumlah pendaftar aktif
 * Edit tidak mengubah status (acara 'rejected' tetap rejected sampai diajukan ulang).
 */
export async function updateEvent(actor: Actor, eventId: number, patch: Partial<EventInput>) {
  return db.transaction(async (tx) => {
    const [ev] = await tx.select().from(events).where(eq(events.id, eventId)).for("update");
    if (!ev) throw new AppError(404, "Acara tidak ditemukan");

    const isAdmin = actor.role === "admin";
    if (!isAdmin && ev.organizerId !== actor.id)
      throw new AppError(403, "Anda bukan penyelenggara acara ini");
    if (ev.status === "completed")
      throw new AppError(400, "Acara yang sudah selesai tidak bisa diubah");
    if (ev.status === "pending" && !isAdmin)
      throw new AppError(400, "Acara sedang ditinjau admin dan tidak bisa diubah");

    assertDates({
      startAt: patch.startAt ?? ev.startAt,
      endAt: patch.endAt ?? ev.endAt,
      deadline: patch.deadline === undefined ? ev.registrationDeadline : patch.deadline,
    });
    if (patch.categoryId !== undefined) await assertCategory(patch.categoryId);

    if (patch.quota !== undefined) {
      const [{ n }] = await tx
        .select({ n: count() })
        .from(registrations)
        .where(and(eq(registrations.eventId, eventId), eq(registrations.status, "registered")));
      if (patch.quota < n)
        throw new AppError(400, `Kuota tidak boleh kurang dari jumlah pendaftar (${n})`);
    }

    const set: Partial<typeof events.$inferInsert> = {};
    if (patch.title !== undefined) set.title = patch.title;
    if (patch.description !== undefined) set.description = patch.description;
    if (patch.posterUrl !== undefined) set.posterUrl = patch.posterUrl;
    if (patch.categoryId !== undefined) set.categoryId = patch.categoryId;
    if (patch.startAt !== undefined) set.startAt = patch.startAt;
    if (patch.endAt !== undefined) set.endAt = patch.endAt;
    if (patch.location !== undefined) set.location = patch.location;
    if (patch.quota !== undefined) set.quota = patch.quota;
    if (patch.certificateAvailable !== undefined) set.certificateAvailable = patch.certificateAvailable;
    if (patch.deadline !== undefined) set.registrationDeadline = patch.deadline;
    if (Object.keys(set).length === 0) throw new AppError(400, "Tidak ada perubahan yang dikirim");

    await tx.update(events).set(set).where(eq(events.id, eventId));
    return { ok: true };
  });
}

/** Hanya acara yang belum pernah dibuka untuk pendaftaran (draft/pending/rejected). */
export async function deleteEvent(actor: Actor, eventId: number) {
  return db.transaction(async (tx) => {
    const [ev] = await tx.select().from(events).where(eq(events.id, eventId)).for("update");
    if (!ev) throw new AppError(404, "Acara tidak ditemukan");
    if (actor.role !== "admin" && ev.organizerId !== actor.id)
      throw new AppError(403, "Anda bukan penyelenggara acara ini");
    if (ev.status === "published" || ev.status === "completed")
      throw new AppError(409, "Acara yang sudah dipublikasikan tidak bisa dihapus");

    const [{ n }] = await tx
      .select({ n: count() })
      .from(registrations)
      .where(eq(registrations.eventId, eventId));
    if (n > 0) throw new AppError(409, "Acara sudah memiliki pendaftar dan tidak bisa dihapus");

    // notifikasi lama (mis. 'acara ditolak') merujuk ke acara ini lewat foreign key
    await tx.delete(notifications).where(eq(notifications.eventId, eventId));
    await tx.delete(events).where(eq(events.id, eventId));
    return { ok: true };
  });
}