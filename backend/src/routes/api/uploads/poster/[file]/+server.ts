import { errorResponse } from "$lib/server/http";
import { loadPoster } from "$lib/server/uploads/posters";
import type { RequestHandler } from "./$types";

// Publik: menyajikan poster (dibaca dari penyimpanan lalu dialirkan oleh backend).
// Hanya URL bertanda tangan yang diterbitkan endpoint upload yang diterima.
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { bytes, mime } = await loadPoster(params.file);
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