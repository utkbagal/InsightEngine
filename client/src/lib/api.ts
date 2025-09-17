import { apiRequest } from "@/lib/queryClient";

export interface Company {
  id: string;
  name: string;
  normalizedName: string;
  createdAt: string;
}

export interface Document {
  id: string;
  companyId: string;
  filename: string;
  fileType: string;
  uploadedAt: string;
  extractedText?: string;
  processed: boolean;
}

export interface FinancialMetrics {
  id: string;
  companyId: string;
  documentId: string;
  period: string;
  year: number;
  quarter?: string;
  revenue?: number;
  netIncome?: number;
  totalAssets?: number;
  cashEquivalents?: number;
  profitMargin?: number;
  yoyGrowth?: number;
  ebitda?: number;
  debt?: number;
  rawMetrics: Record<string, any>;
  extractedAt: string;
}

export interface ComparisonInsight {
  type: 'revenue' | 'profitability' | 'growth' | 'risk' | 'efficiency';
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  companies: string[];
}

export interface ComparisonResult {
  comparison: {
    id: string;
    companyIds: string[];
    insights: {
      insights: ComparisonInsight[];
      summary: string;
    };
    createdAt: string;
  };
  insights: {
    insights: ComparisonInsight[];
    summary: string;
  };
  metrics: (FinancialMetrics & { companyName: string })[];
}

export const api = {
  // Company operations
  async createCompany(name: string): Promise<{ company: Company }> {
    const response = await apiRequest('POST', '/api/companies', { name });
    return response.json();
  },

  async getCompany(companyId: string): Promise<{ company: Company; documents: Document[]; metrics: FinancialMetrics[] }> {
    const response = await apiRequest('GET', `/api/companies/${companyId}`);
    return response.json();
  },

  // Document operations
  async uploadDocument(companyId: string, file: File): Promise<{ document: Document }> {
    const formData = new FormData();
    formData.append('document', file);

    const response = await fetch(`/api/companies/${companyId}/documents`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`${response.status}: ${error}`);
    }

    return response.json();
  },

  // Analysis operations
  async analyzeCompatibility(documentIds: string[]): Promise<{
    compatible: boolean;
    documents: Array<{
      compatible: boolean;
      period: string;
      year: number;
      quarter?: string;
      documentType: string;
      issues: string[];
    }>;
    issues?: string[];
  }> {
    const response = await apiRequest('POST', '/api/analyze/compatibility', { documentIds });
    return response.json();
  },

  async extractMetrics(documentIds: string[]): Promise<{ metrics: (FinancialMetrics & { companyName: string })[] }> {
    const response = await apiRequest('POST', '/api/analyze/metrics', { documentIds });
    return response.json();
  },

  async generateInsights(companyIds: string[]): Promise<ComparisonResult> {
    const response = await apiRequest('POST', '/api/analyze/insights', { companyIds });
    return response.json();
  },

  // Export operations
  async exportComparison(comparisonId: string): Promise<string> {
    const response = await apiRequest('GET', `/api/comparisons/${comparisonId}/export`);
    return response.text();
  },
};
