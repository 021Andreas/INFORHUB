import { z } from "zod";

// Tanpa nilai default di sini, supaya PATCH (partial) tidak menimpa field yang tidak dikirim.
export const eventBodySchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(10000).nullable().optional(),
  posterUrl: z.string().trim().max(500).nullable().optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  location: z.string().trim().min(2).max(255),
  quota: z.number().int().min(1).max(100000),
  certificateAvailable: z.boolean().optional(),
  // Batas akhir pendaftaran; null/kosong = tanpa batas.
  // (union dengan null dulu, karena z.coerce.date() mengubah null menjadi tahun 1970)
  deadline: z.union([z.null(), z.coerce.date()]).optional(),
});