export type Actor = { id: number; role: "mahasiswa" | "penyelenggara" | "admin" };

/** Error yang aman ditampilkan ke klien. `code` opsional agar frontend bisa bereaksi tanpa membaca teks pesan. */
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}