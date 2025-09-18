import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, real, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  sector: text("sector"), // Company industry sector (e.g., "Automotive", "Technology")
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
  
  // Core Financial Metrics (in billions USD)
  revenue: real("revenue"),
  netIncome: real("net_income"),
  grossProfit: real("gross_profit"),
  operatingIncome: real("operating_income"),
  ebitda: real("ebitda"),
  pat: real("pat"), // Profit After Tax (in billions USD)
  
  // Sales Metrics
  salesVolume: real("sales_volume"), // Number of units sold (in millions)
  salesUnits: real("sales_units"), // Alternative field for units sold
  
  // Balance Sheet Metrics (in billions USD)
  totalAssets: real("total_assets"),
  currentAssets: real("current_assets"),
  currentLiabilities: real("current_liabilities"),
  totalDebt: real("total_debt"),
  longTermDebt: real("long_term_debt"),
  shortTermDebt: real("short_term_debt"),
  cashEquivalents: real("cash_equivalents"),
  shareholdersEquity: real("shareholders_equity"),
  
  // Share Information
  sharesOutstanding: real("shares_outstanding"), // in millions
  
  // Calculated Basic Metrics (percentages)
  profitMargin: real("profit_margin"),
  grossMargin: real("gross_margin"),
  operatingMargin: real("operating_margin"),
  yoyGrowth: real("yoy_growth"),
  
  // Profitability Ratios (percentages)
  roe: real("roe"), // Return on Equity
  roa: real("roa"), // Return on Assets  
  roic: real("roic"), // Return on Invested Capital
  
  // Liquidity Ratios
  currentRatio: real("current_ratio"),
  quickRatio: real("quick_ratio"),
  cashRatio: real("cash_ratio"),
  
  // Leverage Ratios
  debtToEquity: real("debt_to_equity"),
  debtToAssets: real("debt_to_assets"),
  interestCoverage: real("interest_coverage"),
  
  // Per Share Metrics (USD)
  eps: real("eps"), // Earnings Per Share
  bookValuePerShare: real("book_value_per_share"),
  
  // Valuation Ratios (requires market data)
  peRatio: real("pe_ratio"),
  pbRatio: real("pb_ratio"),
  marketCap: real("market_cap"), // in billions USD
  
  // Market Data (requires web search/API)
  currentPrice: real("current_price"), // Current market price (USD)
  weekHigh52: real("week_high_52"), // 52-week high (USD)
  weekLow52: real("week_low_52"), // 52-week low (USD)
  dividendYield: real("dividend_yield"), // Dividend yield percentage
  
  // Data Quality and Sources
  extractionConfidence: real("extraction_confidence"), // 0-1 score
  extractionMethod: text("extraction_method"), // 'ai', 'hybrid', 'web'
  dataSource: text("data_source"), // 'document', 'web', 'calculated'
  
  // Legacy fields
  debt: real("debt"), // Keep for backward compatibility
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

// User types for Replit Auth
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

export type Company = typeof companies.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type FinancialMetrics = typeof financialMetrics.$inferSelect;
export type Comparison = typeof comparisons.$inferSelect;

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertFinancialMetrics = z.infer<typeof insertFinancialMetricsSchema>;
export type InsertComparison = z.infer<typeof insertComparisonSchema>;
