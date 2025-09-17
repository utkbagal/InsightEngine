import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  filename: text("filename").notNull(),
  fileType: text("file_type").notNull(),
  uploadedAt: timestamp("uploaded_at").default(sql`now()`).notNull(),
  extractedText: text("extracted_text"),
  processed: boolean("processed").default(false).notNull(),
});

export const financialMetrics = pgTable("financial_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  documentId: varchar("document_id").notNull().references(() => documents.id),
  period: text("period").notNull(),
  year: real("year").notNull(),
  quarter: text("quarter"),
  revenue: real("revenue"),
  netIncome: real("net_income"),
  totalAssets: real("total_assets"),
  cashEquivalents: real("cash_equivalents"),
  profitMargin: real("profit_margin"),
  yoyGrowth: real("yoy_growth"),
  ebitda: real("ebitda"),
  debt: real("debt"),
  rawMetrics: jsonb("raw_metrics"),
  extractedAt: timestamp("extracted_at").default(sql`now()`).notNull(),
});

export const comparisons = pgTable("comparisons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyIds: jsonb("company_ids").notNull(),
  insights: jsonb("insights"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  normalizedName: true,
  createdAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
  processed: true,
});

export const insertFinancialMetricsSchema = createInsertSchema(financialMetrics).omit({
  id: true,
  extractedAt: true,
});

export const insertComparisonSchema = createInsertSchema(comparisons).omit({
  id: true,
  createdAt: true,
});

export type Company = typeof companies.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type FinancialMetrics = typeof financialMetrics.$inferSelect;
export type Comparison = typeof comparisons.$inferSelect;

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertFinancialMetrics = z.infer<typeof insertFinancialMetricsSchema>;
export type InsertComparison = z.infer<typeof insertComparisonSchema>;
