import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const quizSessions = pgTable("quiz_sessions", {
  id: serial("id").primaryKey(),
  board: text("board").notNull(),
  className: text("class_name").notNull(),
  subject: text("subject").notNull(),
  chapter: text("chapter").notNull(),
  level: text("level").notNull(),
  status: text("status").notNull().default("in_progress"),
  score: integer("score"),
  totalQuestions: integer("total_questions").notNull().default(20),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertQuizSessionSchema = createInsertSchema(quizSessions).omit({
  id: true,
  createdAt: true,
});

export type QuizSession = typeof quizSessions.$inferSelect;
export type InsertQuizSession = z.infer<typeof insertQuizSessionSchema>;
