
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
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: mysqlEnum("role", [
    "mahasiswa",
    "penyelenggara",
    "admin",
  ]).notNull().default("mahasiswa"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  organizerId: int("organizer_id")
    .notNull()
    .references(() => users.id),
  startAt: datetime("start_at", { mode: "date" }).notNull(),
  endAt: datetime("end_at", { mode: "date" }).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
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
  ]).notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
    status: mysqlEnum("status", [
      "registered",
      "cancelled",
    ]).notNull().default("registered"),
    registeredAt: timestamp("registered_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("event_user_unique").on(
      table.eventId,
      table.userId,
    ),
  ],
);

export const attendance = mysqlTable("attendance", {
  id: int("id").autoincrement().primaryKey(),
  registrationId: int("registration_id")
    .notNull()
    .unique()
    .references(() => registrations.id),
  status: mysqlEnum("status", [
    "present",
    "absent",
  ]).notNull().default("absent"),
  checkedAt: timestamp("checked_at"),
});

export const certificates = mysqlTable("certificates", {
  id: int("id").autoincrement().primaryKey(),
  registrationId: int("registration_id")
    .notNull()
    .unique()
    .references(() => registrations.id),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id")
    .notNull()
    .references(() => users.id),
  eventId: int("event_id").references(() => events.id),
  message: varchar("message", { length: 500 }).notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
