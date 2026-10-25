import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "$lib/server/db";
import { eventCategories, events } from "$lib/server/db/schema";
import { AppError, listPublishedEvents } from "$lib/server/services/event.service";
import { readJson, requireRole, respond } from "$lib/server/http";
import type { RequestHandler } from "./$types";

// Publik: daftar acara yang sudah published (jumlah "registered" dihitung dari DB)
export const GET: RequestHandler = () => respond(() => listPublishedEvents());

const schema = z
  .object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().max(10000).optional(),
    posterUrl: z.string().trim().max(500).optional(),
    categoryId: z.number().int().positive().optional(),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    location: z.string().trim().min(2).max(255),
    quota: z.number().int().min(1).max(100000),
    certificateAvailable: z.boolean().default(false),
  })
  .refine((d) => d.endAt > d.startAt, {
    message: "endAt harus setelah startAt",
    path: ["endAt"],
  });

// Penyelenggara/admin membuat acara -> status awal 'draft'
export const POST: RequestHandler = ({ request, locals }) =>
  respond(async () => {
    const actor = requireRole(locals, "penyelenggara", "admin");
    const body = schema.parse(await readJson(request));

    if (body.categoryId) {
      const [cat] = await db
        .select({ id: eventCategories.id })
        .from(eventCategories)
        .where(eq(eventCategories.id, body.categoryId));
      if (!cat) throw new AppError(400, "Kategori tidak ditemukan");
    }

    const [res] = await db.insert(events).values({
      ...body,
      organizerId: actor.id,
      status: "draft",
    });
    return { id: res.insertId, status: "draft" };
  }, 201);