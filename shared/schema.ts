import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  freeAttempts: integer("free_attempts").notNull().default(3),
  subscriptionStatus: text("subscription_status").default("free"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
});

// Assignment History table schema
export const assignmentHistory = pgTable("assignment_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  processedOutputUrl: text("processed_output_url"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  attemptCount: integer("attempt_count").notNull().default(1),
  extractedText: text("extracted_text"),
  solution: text("solution"),
});

// Subscription Payments table schema
export const subscriptionPayments = pgTable("subscription_payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("INR"),
  paymentId: text("payment_id"),
  orderId: text("order_id"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  status: text("status").notNull().default("pending"),
  planType: text("plan_type").notNull(), // 'monthly' or 'pack'
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  freeAttempts: true,
  subscriptionStatus: true,
  subscriptionExpiresAt: true,
});

export const insertAssignmentHistorySchema = createInsertSchema(assignmentHistory).pick({
  userId: true,
  fileName: true,
  fileUrl: true,
  processedOutputUrl: true,
  attemptCount: true,
  extractedText: true,
  solution: true,
});

export const insertSubscriptionPaymentSchema = createInsertSchema(subscriptionPayments).pick({
  userId: true,
  amount: true,
  currency: true,
  paymentId: true,
  orderId: true,
  status: true,
  planType: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type AssignmentHistory = typeof assignmentHistory.$inferSelect;
export type InsertAssignmentHistory = z.infer<typeof insertAssignmentHistorySchema>;

export type SubscriptionPayment = typeof subscriptionPayments.$inferSelect;
export type InsertSubscriptionPayment = z.infer<typeof insertSubscriptionPaymentSchema>;

// Login validation schema
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// Registration validation schema
export const registrationSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
