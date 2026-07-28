import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { quizSessions } from "./quizSessions";

export const quizQuestions = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => quizSessions.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  options: text("options").notNull(), // JSON array stored as text
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation").notNull(),
  type: text("type").notNull().default("ai_generated"), // "previous_year" | "ai_generated"
  year: text("year"),
  topic: text("topic").notNull().default(""),
  difficulty: text("difficulty").notNull().default("medium"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertQuizQuestionSchema = createInsertSchema(quizQuestions).omit({
  id: true,
  createdAt: true,
});

export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type InsertQuizQuestion = z.infer<typeof insertQuizQuestionSchema>;
