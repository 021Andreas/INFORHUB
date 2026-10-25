// Ganti seluruh isi src/app.d.ts dengan ini
declare global {
  namespace App {
    interface Locals {
      user: {
        id: number;
        name: string;
        email: string;
        role: "mahasiswa" | "penyelenggara" | "admin";
      } | null;
    }
  }
}

export {};