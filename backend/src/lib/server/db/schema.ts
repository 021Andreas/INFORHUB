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

  // F-02: identitas. NIM unik untuk mahasiswa; profil organisasi + verifikasi untuk penyelenggara.
  nim: varchar("nim", { length: 20 }).unique(),
  organizationName: varchar("organization_name", { length: 150 }),
  verificationStatus: mysqlEnum("verification_status", ["none", "pending", "verified", "rejected"])
    .notNull()
    .default("none"),
  verificationNote: varchar("verification_note", { length: 500 }),
  verifiedAt: datetime("verified_at", { mode: "date" }),
  verifiedBy: int("verified_by"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

/* ------------------------------------------------------------------ */
/* CERTIFICATE TEMPLATES (F-23): tiap "versi" adalah satu baris yang  */
/* tidak diubah lagi, supaya sertifikat lama tetap merujuk template   */
/* yang dipakai saat terbit.                                          */
/* ------------------------------------------------------------------ */
export const certificateTemplates = mysqlTable(
  "certificate_templates",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    version: int("version").notNull(),
    config: text("config").notNull(), // JSON pengaturan elemen (lihat certificates/config.ts)
    isDefault: boolean("is_default").notNull().default(false),
    createdBy: int("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("template_name_version_unique").on(table.name, table.version)],
);

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
    // Kosong = pakai template default
    certificateTemplateId: int("certificate_template_id").references(() => certificateTemplates.id),
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
  // F-12: template (versi) yang dipakai saat terbit. Kosong = template bawaan kode.
  templateId: int("template_id").references(() => certificateTemplates.id),
  // F-25: kode acak untuk verifikasi publik (di dalam QR); sengaja terpisah dari nomor sertifikat.
  verificationCode: varchar("verification_code", { length: 32 }).unique(),
  status: mysqlEnum("status", ["valid", "revoked"]).notNull().default("valid"),
  revokedAt: datetime("revoked_at", { mode: "date" }),
  revokedReason: varchar("revoked_reason", { length: 255 }),
  revokedBy: int("revoked_by").references(() => users.id),
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
      "certificate_revoked",
      "event_updated",
      "organizer_verified",
      "organizer_rejected",
    ]).notNull(),
    message: varchar("message", { length: 500 }).notNull(),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("notifications_user_read_idx").on(table.userId, table.isRead)],
);

/* ------------------------------------------------------------------ */
/* SAVED EVENTS (F-09)                                                 */
/* ------------------------------------------------------------------ */
export const savedEvents = mysqlTable(
  "saved_events",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id),
    eventId: int("event_id")
      .notNull()
      .references(() => events.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("saved_user_event_unique").on(table.userId, table.eventId),
    index("saved_user_idx").on(table.userId),
  ],
);

/* ------------------------------------------------------------------ */
/* EVENT REVIEWS (F-21): satu ulasan per peserta yang hadir            */
/* ------------------------------------------------------------------ */
export const eventReviews = mysqlTable(
  "event_reviews",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("event_id")
      .notNull()
      .references(() => events.id),
    userId: int("user_id")
      .notNull()
      .references(() => users.id),
    rating: int("rating").notNull(), // 1..5 (divalidasi di aplikasi)
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("review_event_user_unique").on(table.eventId, table.userId),
    index("review_event_idx").on(table.eventId),
  ],
);