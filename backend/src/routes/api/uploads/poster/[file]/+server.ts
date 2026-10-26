import { errorResponse } from "$lib/server/http";
import { readPoster } from "$lib/server/uploads/posters";
import type { RequestHandler } from "./$types";

// Publik: menyajikan poster. Nama file acak (UUID) dan divalidasi ketat.
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { bytes, mime } = await readPoster(params.file);
    return new Response(bytes as BodyInit, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "cross-origin",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
};