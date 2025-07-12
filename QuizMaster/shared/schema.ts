import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  roomCode: text("room_code").notNull().unique(),
  hostId: text("host_id").notNull(),
  currentQuestion: integer("current_question").default(0),
  totalQuestions: integer("total_questions").default(10),
  gameState: text("game_state").notNull().default("waiting"), // waiting, active, finished
  timer: integer("timer").default(0),
  correctAnswer: text("correct_answer"), // A, B, C, D
  createdAt: timestamp("created_at").defaultNow(),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").references(() => games.id),
  name: text("name").notNull(),
  socketId: text("socket_id").notNull(),
  totalScore: integer("total_score").default(0),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const answers = pgTable("answers", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").references(() => games.id),
  playerId: integer("player_id").references(() => players.id),
  questionNumber: integer("question_number").notNull(),
  answer: text("answer").notNull(), // A, B, C, D
  timeToAnswer: integer("time_to_answer").notNull(), // in milliseconds
  isCorrect: boolean("is_correct").default(false),
  points: integer("points").default(0),
  answeredAt: timestamp("answered_at").defaultNow(),
});

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  createdAt: true,
});

export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  joinedAt: true,
});

export const insertAnswerSchema = createInsertSchema(answers).omit({
  id: true,
  answeredAt: true,
});

export type Game = typeof games.$inferSelect;
export type Player = typeof players.$inferSelect;
export type Answer = typeof answers.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type InsertAnswer = z.infer<typeof insertAnswerSchema>;

// WebSocket message types
export const messageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("join_game"),
    data: z.object({
      roomCode: z.string(),
      playerName: z.string(),
    }),
  }),
  z.object({
    type: z.literal("host_action"),
    data: z.object({
      action: z.enum(["next_question", "set_answer", "start_timer", "end_game"]),
      value: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal("submit_answer"),
    data: z.object({
      answer: z.enum(["A", "B", "C", "D"]),
      timeToAnswer: z.number(),
    }),
  }),
]);

export type WebSocketMessage = z.infer<typeof messageSchema>;
