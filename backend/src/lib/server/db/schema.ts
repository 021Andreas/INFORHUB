import {
  mysqlTable,
  int,
  varchar,
  text,
  mysqlEnum,
  datetime,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";

/* ------------------------------------------------------------------ */
/* USERS                                                               */
/* ------------------------------------------------------------------ */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["mahasiswa", "penyelenggara", "admin"])
    .notNull()
    .default("mahasiswa"),

  // Status akun: pending_verification = belum verifikasi email,
  // suspended = diblokir admin
  status: mysqlEnum("status", ["pending_verification", "active", "suspended"])
    .notNull()
    .default("pending_verification"),
  emailVerifiedAt: datetime("email_verified_at", { mode: "date" }),
  // Simpan HASH dari token verifikasi, bukan token aslinya
  verificationTokenHash: varchar("verification_token_hash", { length: 255 }),
  verificationExpiresAt: datetime("verification_expires_at", { mode: "date" }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

/* ------------------------------------------------------------------ */
/* EVENT CATEGORIES (baru)                                             */
/* ------------------------------------------------------------------ */
export const eventCategories = mysqlTable("event_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
});

/* ------------------------------------------------------------------ */
/* EVENTS                                                              */
/* Alur: penyelenggara/admin membuat (draft) -> submit (pending)       */
/*       -> admin review -> published | rejected -> completed          */
/* ------------------------------------------------------------------ */
export const events = mysqlTable(
  "events",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    posterUrl: varchar("poster_url", { length: 500 }),
    categoryId: int("category_id").references(() => eventCategories.id),
    organizerId: int("organizer_id")
      .notNull()
      .references(() => users.id),
    startAt: datetime("start_at", { mode: "date" }).notNull(),
    endAt: datetime("end_at", { mode: "date" }).notNull(),
    location: varchar("location", { length: 255 }).notNull(),
    // Batas akhir pendaftaran (opsional). Kosong = bisa daftar sampai acara selesai.
    registrationDeadline: datetime("registration_deadline", { mode: "date" }),
    quota: int("quota").notNull(),
    certificateAvailable: boolean("certificate_available")
      .notNull()
      .default(false),
    status: mysqlEnum("status", [
      "draft",
      "pending",
      "published",
      "rejected",
      "completed",
    ])
      .notNull()
      .default("draft"),

    // Jejak review admin
    reviewedBy: int("reviewed_by").references(() => users.id),
    reviewedAt: datetime("reviewed_at", { mode: "date" }),
    rejectionReason: varchar("rejection_reason", { length: 500 }),
    publishedAt: datetime("published_at", { mode: "date" }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("events_status_start_idx").on(table.status, table.startAt),
    index("events_organizer_idx").on(table.organizerId),
    index("events_category_idx").on(table.categoryId),
  ],
);

/* ------------------------------------------------------------------ */
/* REGISTRATIONS                                                       */
/* Kuota dijaga di backend (transaksi + lock), lihat catatan di bawah. */
/* Jumlah "registered" di homepage = COUNT status 'registered'.        */
/* ------------------------------------------------------------------ */
export const registrations = mysqlTable(
  "registrations",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("event_id")
      .notNull()
      .references(() => events.id),
    userId: int("user_id")
      .notNull()
      .references(() => users.id),
    status: mysqlEnum("status", ["registered", "cancelled"])
      .notNull()
      .default("registered"),

    // Kode unik untuk QR tiket -> dipakai identifikasi peserta saat check-in
    ticketCode: varchar("ticket_code", { length: 64 }).notNull().unique(),

    registeredAt: timestamp("registered_at").defaultNow().notNull(),
    cancelledAt: datetime("cancelled_at", { mode: "date" }),
  },
  (table) => [
    // Mencegah pendaftaran ganda. Jika user batal lalu daftar lagi,
    // UPDATE baris lama menjadi 'registered' (jangan INSERT baru).
    uniqueIndex("event_user_unique").on(table.eventId, table.userId),
    index("registrations_event_status_idx").on(table.eventId, table.status),
    index("registrations_user_idx").on(table.userId),
  ],
);

/* ------------------------------------------------------------------ */
/* ATTENDANCE                                                          */
/* Yang boleh mencatat: penyelenggara event tsb dan admin.             */
/* Peserta diidentifikasi lewat registrations.ticketCode (scan QR).    */
/* ------------------------------------------------------------------ */
export const attendance = mysqlTable("attendance", {
  id: int("id").autoincrement().primaryKey(),
  registrationId: int("registration_id")
    .notNull()
    .unique()
    .references(() => registrations.id),
  status: mysqlEnum("status", ["present", "absent"])
    .notNull()
    .default("absent"),
  method: mysqlEnum("method", ["qr", "manual"]).notNull().default("qr"),
  checkedBy: int("checked_by").references(() => users.id),
  checkedAt: datetime("checked_at", { mode: "date" }),
});

/* ------------------------------------------------------------------ */
/* CERTIFICATES                                                        */
/* Format: PDF. Terbit jika: event.certificateAvailable = true,        */
/* event.status = 'completed', dan attendance = 'present'.             */
/* Unduh: pemilik sertifikat, penyelenggara event, admin.              */
/* ------------------------------------------------------------------ */
export const certificates = mysqlTable("certificates", {
  id: int("id").autoincrement().primaryKey(),
  registrationId: int("registration_id")
    .notNull()
    .unique()
    .references(() => registrations.id),
  certificateNumber: varchar("certificate_number", { length: 50 })
    .notNull()
    .unique(),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  issuedBy: int("issued_by").references(() => users.id),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
});

/* ------------------------------------------------------------------ */
/* NOTIFICATIONS                                                       */
/* Dibuat saat: daftar berhasil, batal, acara di-approve/ditolak,      */
/* pengingat H-1, sertifikat terbit.                                   */
/* ------------------------------------------------------------------ */
export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id),
    eventId: int("event_id").references(() => events.id),
    type: mysqlEnum("type", [
      "registration_success",
      "registration_cancelled",
      "event_approved",
      "event_rejected",
      "event_reminder",
      "certificate_issued",
    ]).notNull(),
    message: varchar("message", { length: 500 }).notNull(),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("notifications_user_read_idx").on(table.userId, table.isRead)],
);