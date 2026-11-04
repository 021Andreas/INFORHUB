import { and, avg, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "$lib/server/db";
import { isDuplicateError } from "$lib/server/db-errors";
import { AppError } from "$lib/server/errors";
import {
  attendance,
  eventCategories,
  eventReviews,
  events,
  registrations,
  savedEvents,
  users,
} from "$lib/server/db/schema";
import { registeredCount } from "./sql-helpers";

/* ====================== F-09 acara tersimpan ====================== */

export async function saveEvent(userId: number, eventId: number) {
  const [ev] = await db
    .select({ status: events.status })
    .from(events)
    .where(and(eq(events.id, eventId), inArray(events.status, ["published", "completed"])));
  if (!ev) throw new AppError(404, "Acara tidak ditemukan");
  try {
    await db.insert(savedEvents).values({ userId, eventId });
  } catch (e) {
    if (!isDuplicateError(e)) throw e; // sudah tersimpan: tidak apa-apa (idempoten)
  }
  return { saved: true };
}

export async function unsaveEvent(userId: number, eventId: number) {
  await db.delete(savedEvents).where(and(eq(savedEvents.userId, userId), eq(savedEvents.eventId, eventId)));
  return { saved: false };
}

export async function listSavedEvents(userId: number) {
  return db
    .select({
      id: events.id,
      title: events.title,
      posterUrl: events.posterUrl,
      category: eventCategories.name,
      startAt: events.startAt,
      endAt: events.endAt,
      location: events.location,
      quota: events.quota,
      eventStatus: events.status,
      registered: registeredCount(),
      savedAt: savedEvents.createdAt,
    })
    .from(savedEvents)
    .innerJoin(events, eq(events.id, savedEvents.eventId))
    .leftJoin(eventCategories, eq(eventCategories.id, events.categoryId))
    .where(eq(savedEvents.userId, userId))
    .orderBy(desc(savedEvents.createdAt), desc(savedEvents.id));
}

/* ====================== F-21 komentar / evaluasi ====================== */

/** Hanya peserta yang tercatat HADIR, setelah acara selesai. Satu ulasan per orang; mengirim lagi = mengubah. */
export async function upsertReview(
  userId: number,
  eventId: number,
  input: { rating: number; comment?: string | null },
) {
  const [row] = await db
    .select({
      event: events,
      regStatus: registrations.status,
      attended: attendance.status,
    })
    .from(events)
    .leftJoin(registrations, and(eq(registrations.eventId, events.id), eq(registrations.userId, userId)))
    .leftJoin(attendance, eq(attendance.registrationId, registrations.id))
    .where(eq(events.id, eventId));

  if (!row || !["published", "completed"].includes(row.event.status))
    throw new AppError(404, "Acara tidak ditemukan");
  if (row.regStatus !== "registered" || row.attended !== "present")
    throw new AppError(403, "Hanya peserta yang hadir yang dapat memberi ulasan", "NOT_ATTENDED");
  if (row.event.status !== "completed" && row.event.endAt > new Date())
    throw new AppError(400, "Ulasan dibuka setelah acara selesai", "EVENT_NOT_FINISHED");

  const comment = input.comment?.trim() || null;
  await db
    .insert(eventReviews)
    .values({ eventId, userId, rating: input.rating, comment })
    .onDuplicateKeyUpdate({ set: { rating: input.rating, comment } });
  return { ok: true };
}

export async function deleteMyReview(userId: number, eventId: number) {
  await db.delete(eventReviews).where(and(eq(eventReviews.eventId, eventId), eq(eventReviews.userId, userId)));
  return { ok: true };
}

export async function listReviews(
  viewerId: number | null,
  eventId: number,
  opts: { limit: number; offset: number },
) {
  const [ev] = await db
    .select({ status: events.status })
    .from(events)
    .where(and(eq(events.id, eventId), inArray(events.status, ["published", "completed"])));
  if (!ev) throw new AppError(404, "Acara tidak ditemukan");

  const where = eq(eventReviews.eventId, eventId);
  const [agg] = await db.select({ n: count(), mean: avg(eventReviews.rating) }).from(eventReviews).where(where);
  const dist = await db
    .select({ rating: eventReviews.rating, n: count() })
    .from(eventReviews)
    .where(where)
    .groupBy(eventReviews.rating);
  const distribution: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  for (const d of dist) distribution[String(d.rating)] = d.n;

  const items = await db
    .select({
      id: eventReviews.id,
      userName: users.name,
      rating: eventReviews.rating,
      comment: eventReviews.comment,
      createdAt: eventReviews.createdAt,
      updatedAt: eventReviews.updatedAt,
    })
    .from(eventReviews)
    .innerJoin(users, eq(users.id, eventReviews.userId))
    .where(where)
    .orderBy(desc(eventReviews.createdAt), desc(eventReviews.id))
    .limit(opts.limit)
    .offset(opts.offset);

  let myReview: { rating: number; comment: string | null } | null = null;
  if (viewerId) {
    const [mine] = await db
      .select({ rating: eventReviews.rating, comment: eventReviews.comment })
      .from(eventReviews)
      .where(and(where, eq(eventReviews.userId, viewerId)));
    myReview = mine ?? null;
  }

  return {
    summary: {
      count: agg.n,
      average: agg.mean === null ? null : Math.round(Number(agg.mean) * 100) / 100,
      distribution,
    },
    myReview,
    items,
    total: agg.n,
  };
}