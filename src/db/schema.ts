import { pgTable, text, timestamp } from "drizzle-orm/pg-core"

export const userRoles = ["student", "supervised_counsellor", "supervisor", "certified_counsellor"] as const
export type UserRole = (typeof userRoles)[number]

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  role: text("role").notNull().default("student"),
  createdAt: timestamp("created_at").notNull(),
})

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  audioUrl: text("audio_url"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull(),
})

export const transcripts = pgTable("transcripts", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id),
  rawText: text("raw_text").notNull(),
  speakerA: text("speaker_a"),
  speakerB: text("speaker_b"),
  createdAt: timestamp("created_at").notNull(),
})

export const feedback = pgTable("feedback", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id),
  pedagogicalLens: text("pedagogical_lens").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull(),
})