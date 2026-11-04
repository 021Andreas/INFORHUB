import { json } from "@sveltejs/kit";
import { errorResponse } from "$lib/server/http";
import { getPublicVerification } from "$lib/server/services/certificate.service";
import type { RequestHandler } from "./$types";

// PUBLIK (tanpa login): tujuan QR di sertifikat. Hanya data minimum + status valid/dicabut.
// Kode tidak dikenal -> 404 { error, code: "NOT_FOUND" }.
export const GET: RequestHandler = async ({ params }) => {
  try {
    const result = await getPublicVerification(params.code);
    return json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const res = errorResponse(e);
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
};