import { type Company, type Document, type FinancialMetrics, type Comparison, type InsertCompany, type InsertDocument, type InsertFinancialMetrics, type InsertComparison } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Companies
  createCompany(company: InsertCompany & { normalizedName: string }): Promise<Company>;
  getCompany(id: string): Promise<Company | undefined>;
  getCompanyByName(name: string): Promise<Company | undefined>;
  
  // Documents
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: string): Promise<Document | undefined>;
  getDocumentsByCompany(companyId: string): Promise<Document[]>;
  updateDocumentProcessed(id: string, extractedText: string): Promise<void>;
  
  // Financial Metrics
  createFinancialMetrics(metrics: InsertFinancialMetrics): Promise<FinancialMetrics>;
  getMetricsByCompany(companyId: string): Promise<FinancialMetrics[]>;
  getMetricsByDocument(documentId: string): Promise<FinancialMetrics | undefined>;
  
  // Comparisons
  createComparison(comparison: InsertComparison): Promise<Comparison>;
  getComparison(id: string): Promise<Comparison | undefined>;
}

export class MemStorage implements IStorage {
  private companies: Map<string, Company> = new Map();
  private documents: Map<string, Document> = new Map();
  private financialMetrics: Map<string, FinancialMetrics> = new Map();
  private comparisons: Map<string, Comparison> = new Map();

  async createCompany(insertCompany: InsertCompany & { normalizedName: string }): Promise<Company> {
    const id = randomUUID();
    const company: Company = {
      ...insertCompany,
      id,
      createdAt: new Date(),
    };
    this.companies.set(id, company);
    return company;
  }

  async getCompany(id: string): Promise<Company | undefined> {
    return this.companies.get(id);
  }

  async getCompanyByName(name: string): Promise<Company | undefined> {
    return Array.from(this.companies.values()).find(
      (company) => company.name.toLowerCase() === name.toLowerCase() || 
                   company.normalizedName.toLowerCase() === name.toLowerCase()
    );
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const document: Document = {
      ...insertDocument,
      id,
      uploadedAt: new Date(),
      extractedText: null,
      processed: false,
    };
    this.documents.set(id, document);
    return document;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getDocumentsByCompany(companyId: string): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(
      (doc) => doc.companyId === companyId
    );
  }

  async updateDocumentProcessed(id: string, extractedText: string): Promise<void> {
    const document = this.documents.get(id);
    if (document) {
      document.extractedText = extractedText;
      document.processed = true;
      this.documents.set(id, document);
    }
  }

  async createFinancialMetrics(insertMetrics: InsertFinancialMetrics): Promise<FinancialMetrics> {
    const id = randomUUID();
    const metrics: FinancialMetrics = {
      ...insertMetrics,
      id,
      quarter: insertMetrics.quarter || null,
      revenue: insertMetrics.revenue || null,
      netIncome: insertMetrics.netIncome || null,
      totalAssets: insertMetrics.totalAssets || null,
      cashEquivalents: insertMetrics.cashEquivalents || null,
      profitMargin: insertMetrics.profitMargin || null,
      yoyGrowth: insertMetrics.yoyGrowth || null,
      ebitda: insertMetrics.ebitda || null,
      debt: insertMetrics.debt || null,
      rawMetrics: insertMetrics.rawMetrics || {},
      extractedAt: new Date(),
    };
    this.financialMetrics.set(id, metrics);
    return metrics;
  }

  async getMetricsByCompany(companyId: string): Promise<FinancialMetrics[]> {
    return Array.from(this.financialMetrics.values()).filter(
      (metrics) => metrics.companyId === companyId
    );
  }

  async getMetricsByDocument(documentId: string): Promise<FinancialMetrics | undefined> {
    return Array.from(this.financialMetrics.values()).find(
      (metrics) => metrics.documentId === documentId
    );
  }

  async createComparison(insertComparison: InsertComparison): Promise<Comparison> {
    const id = randomUUID();
    const comparison: Comparison = {
      ...insertComparison,
      id,
      insights: insertComparison.insights || null,
      createdAt: new Date(),
    };
    this.comparisons.set(id, comparison);
    return comparison;
  }

  async getComparison(id: string): Promise<Comparison | undefined> {
    return this.comparisons.get(id);
  }
}

export const storage = new MemStorage();
