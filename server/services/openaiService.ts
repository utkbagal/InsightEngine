import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export interface ExtractedMetrics {
  companyName: string;
  period: string;
  year: number;
  quarter?: string | null;
  revenue?: number | null;
  netIncome?: number | null;
  totalAssets?: number | null;
  cashEquivalents?: number | null;
  profitMargin?: number | null;
  yoyGrowth?: number | null;
  ebitda?: number | null;
  debt?: number | null;
  rawMetrics: Record<string, any>;
}

export interface DocumentCompatibility {
  compatible: boolean;
  period: string;
  year: number;
  quarter?: string | null;
  documentType: string;
  issues: string[];
}

export interface ComparisonInsights {
  insights: Array<{
    type: 'revenue' | 'profitability' | 'growth' | 'risk' | 'efficiency';
    title: string;
    description: string;
    impact: 'positive' | 'negative' | 'neutral';
    companies: string[];
  }>;
  summary: string;
}

export class OpenAIService {
  async extractFinancialMetrics(text: string, companyName?: string): Promise<ExtractedMetrics> {
    const prompt = `
    Analyze the following financial document text and extract key financial metrics. 
    ${companyName ? `The document is for company: ${companyName}` : ''}
    
    Return the data in JSON format with the following structure:
    {
      "companyName": "string",
      "period": "string (e.g., Q1 2023, FY 2023)",
      "year": number,
      "quarter": "string (Q1, Q2, Q3, Q4) or null for annual",
      "revenue": number (in billions USD),
      "netIncome": number (in billions USD),
      "totalAssets": number (in billions USD),
      "cashEquivalents": number (in billions USD),
      "profitMargin": number (as percentage),
      "yoyGrowth": number (as percentage),
      "ebitda": number (in billions USD),
      "debt": number (in billions USD),
      "rawMetrics": {}
    }
    
    Extract all monetary values in billions USD. If a metric is not found, use null.
    
    Document text:
    ${text.slice(0, 8000)}
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are a financial analyst expert. Extract financial metrics from documents and return structured JSON data."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 2000
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result as ExtractedMetrics;
    } catch (error) {
      console.error('OpenAI extraction error:', error);
      throw new Error(`Failed to extract financial metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validateDocumentCompatibility(documents: Array<{ text: string, companyName: string }>): Promise<DocumentCompatibility[]> {
    const prompt = `
    Analyze the following financial documents for compatibility. Check if they:
    1. Belong to the same reporting period (year/quarter)
    2. Are the same type of financial document (10-K, 10-Q, annual report, etc.)
    3. Can be meaningfully compared

    Return a JSON array with compatibility analysis for each document:
    [
      {
        "compatible": boolean,
        "period": "string",
        "year": number,
        "quarter": "string or null",
        "documentType": "string",
        "issues": ["array of issues if not compatible"]
      }
    ]

    Documents:
    ${documents.map((doc, idx) => `Document ${idx + 1} (${doc.companyName}):\n${doc.text.slice(0, 2000)}\n\n`).join('')}
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are a financial analyst expert. Analyze document compatibility for financial comparisons."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const result = JSON.parse(response.choices[0].message.content || '{"documents": []}');
      return result.documents || [];
    } catch (error) {
      console.error('OpenAI compatibility check error:', error);
      throw new Error(`Failed to validate document compatibility: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateComparisonInsights(metrics: ExtractedMetrics[]): Promise<ComparisonInsights> {
    const prompt = `
    Analyze the following financial metrics from multiple companies and generate key insights for comparison.
    Focus on:
    1. Revenue differences and market position
    2. Profitability and efficiency comparisons
    3. Growth trends and trajectories
    4. Risk assessment and financial stability
    5. Operational efficiency metrics

    Return insights in JSON format:
    {
      "insights": [
        {
          "type": "revenue|profitability|growth|risk|efficiency",
          "title": "string",
          "description": "string",
          "impact": "positive|negative|neutral",
          "companies": ["array of company names involved"]
        }
      ],
      "summary": "Overall comparison summary"
    }

    Company Financial Metrics:
    ${JSON.stringify(metrics, null, 2)}
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are a financial analyst expert. Generate actionable insights from financial comparisons."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const result = JSON.parse(response.choices[0].message.content || '{"insights": [], "summary": ""}');
      return result as ComparisonInsights;
    } catch (error) {
      console.error('OpenAI insights generation error:', error);
      throw new Error(`Failed to generate comparison insights: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const openaiService = new OpenAIService();
