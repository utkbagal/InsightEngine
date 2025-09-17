import OpenAI from "openai";
import { geminiService } from "./geminiService";

// Using standard OpenAI API
const openai = new OpenAI({
  apiKey:
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY_ENV_VAR ||
    "default_key",
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
    type: "revenue" | "profitability" | "growth" | "risk" | "efficiency";
    title: string;
    description: string;
    impact: "positive" | "negative" | "neutral";
    companies: string[];
  }>;
  summary: string;
}

export class OpenAIService {
  /**
   * Detect if an error is a connectivity issue that should trigger Gemini fallback
   */
  private isConnectivityError(error: any): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      const stack = error.stack?.toLowerCase() || '';
      
      // Check for common connectivity error patterns
      const connectivityPatterns = [
        'enotfound',           // DNS resolution failed
        'connection error',     // General connection error
        'timeout',             // Request timeout
        'network error',       // Network issues
        'connection refused',  // Connection refused
        'econnreset',         // Connection reset
        'etimedout',          // Connection timeout
        'econnrefused',       // Connection refused
        'eai_again',          // Temporary DNS failure
        'aborted'             // Request aborted
      ];
      
      const hasConnectivityError = connectivityPatterns.some(pattern => 
        message.includes(pattern) || stack.includes(pattern)
      );
      
      // Check for OpenAI specific API error codes
      if (error.constructor.name === 'APIError' || 'status' in error) {
        const status = (error as any).status;
        // 401 Authentication errors (invalid API key) should trigger fallback
        // 408 Request Timeout, 5xx Server Errors indicate connectivity issues
        if (status === 401 || status === 408 || (status >= 500 && status <= 599)) {
          return true;
        }
      }
      
      // Check for authentication errors specifically
      if (error.constructor.name === 'AuthenticationError' || 
          (error as any).code === 'invalid_api_key') {
        return true; // Invalid API key - service effectively unavailable
      }
      
      // Check error codes directly
      const errorCode = (error as any).code;
      if (errorCode) {
        const connectivityCodes = ['ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN'];
        if (connectivityCodes.includes(errorCode)) {
          return true;
        }
      }
      
      return hasConnectivityError;
    }
    return false;
  }

  /**
   * Sanitize error messages for client consumption
   */
  private sanitizeErrorMessage(error: Error, context: string): string {
    const message = error.message.toLowerCase();
    
    // If it's a connectivity error, return a generic message
    if (this.isConnectivityError(error)) {
      return 'Analysis service temporarily unavailable. Please try again in a few moments.';
    }
    
    // Remove provider-specific details but keep useful information
    const sanitized = error.message
      .replace(/openai|gpt-4|api key|gemini/gi, 'AI service')
      .replace(/quota exceeded|rate limit/gi, 'service limit reached')
      .replace(/authentication failed/gi, 'service authentication error');
    
    return sanitized || `Failed to complete ${context}`;
  }

  /**
   * Extract company name from document text without any user input bias
   * This prevents prompt leakage and ensures objective company name extraction
   * Automatically falls back to Gemini if OpenAI connectivity fails
   */
  async extractCompanyName(text: string): Promise<string | null> {
    const prompt = `
    Analyze the following financial document text and extract the primary company name.
    
    Return ONLY the company name as a simple string, without any additional text or formatting.
    If no clear company name is found, return null.
    
    Focus on:
    - Company name in headers, titles, or document metadata
    - Legal entity names (Inc., Corp., LLC, etc.)
    - Main subject company (not subsidiaries or partners)
    
    Document text:
    ${text.slice(0, 4000)}
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a financial analyst expert. Extract company names objectively from financial documents. Return only the company name or null."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 100
      });

      const result = response.choices[0].message.content?.trim();
      return result && result.toLowerCase() !== 'null' ? result : null;
    } catch (error) {
      console.error('OpenAI company name extraction error:', error);
      
      // Fall back to Gemini if it's a connectivity error
      if (this.isConnectivityError(error)) {
        console.log('OpenAI connectivity failed, falling back to Gemini for company name extraction');
        try {
          return await geminiService.extractCompanyName(text);
        } catch (geminiError) {
          console.error('Gemini fallback also failed:', geminiError);
          throw new Error(
            this.sanitizeErrorMessage(error instanceof Error ? error : new Error('Unknown error'), 'company name extraction')
          );
        }
      }
      
      // If not a connectivity error, throw sanitized error
      throw new Error(
        this.sanitizeErrorMessage(error instanceof Error ? error : new Error('Unknown error'), 'company name extraction')
      );
    }
  }
  /**
   * Extract financial metrics from document text
   * Automatically falls back to Gemini if OpenAI connectivity fails  
   */
  async extractFinancialMetrics(
    text: string,
    validatedCompanyName: string
  ): Promise<ExtractedMetrics> {
    const prompt = `
    Analyze the following financial document text and extract key financial metrics.
    
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
    Set companyName to the extracted company name from the document.
    
    Document text:
    ${text.slice(0, 8000)}
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are a financial analyst expert. Extract financial metrics from documents and return structured JSON data.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 2000,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      // Ensure we use the pre-validated company name to prevent bias
      result.companyName = validatedCompanyName;
      return result as ExtractedMetrics;
    } catch (error) {
      console.error("OpenAI extraction error:", error);
      
      // Fall back to Gemini if it's a connectivity error
      if (this.isConnectivityError(error)) {
        console.log('OpenAI connectivity failed, falling back to Gemini for metrics extraction');
        try {
          return await geminiService.extractFinancialMetrics(text, validatedCompanyName);
        } catch (geminiError) {
          console.error('Gemini fallback also failed:', geminiError);
          throw new Error(
            this.sanitizeErrorMessage(error instanceof Error ? error : new Error('Unknown error'), 'financial metrics extraction')
          );
        }
      }
      
      // If not a connectivity error, throw sanitized error
      throw new Error(
        this.sanitizeErrorMessage(error instanceof Error ? error : new Error('Unknown error'), 'financial metrics extraction')
      );
    }
  }

  /**
   * Validate document compatibility for meaningful comparisons
   * Automatically falls back to Gemini if OpenAI connectivity fails
   */
  async validateDocumentCompatibility(
    documents: Array<{ text: string; companyName: string }>,
  ): Promise<DocumentCompatibility[]> {
    const prompt = `
    Analyze the following financial documents for compatibility. Check if they:
    1. Belong to the same reporting period (year/quarter)
    2. Are the same type of financial document (10-K, 10-Q, annual report, etc.)
    3. Can be meaningfully compared

    Return a JSON object with compatibility analysis for each document:
    {
      "documents": [
        {
          "compatible": boolean,
          "period": "string",
          "year": number,
          "quarter": "string or null",
          "documentType": "string",
          "issues": ["array of issues if not compatible"]
        }
      ]
    }

    Documents:
    ${documents.map((doc, idx) => `Document ${idx + 1} (${doc.companyName}):\n${doc.text.slice(0, 2000)}\n\n`).join("")}
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are a financial analyst expert. Analyze document compatibility for financial comparisons.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const result = JSON.parse(
        response.choices[0].message.content || '{"documents": []}',
      );
      return result.documents || [];
    } catch (error) {
      console.error("OpenAI compatibility check error:", error);
      
      // Fall back to Gemini if it's a connectivity error
      if (this.isConnectivityError(error)) {
        console.log('OpenAI connectivity failed, falling back to Gemini for document compatibility validation');
        try {
          return await geminiService.validateDocumentCompatibility(documents);
        } catch (geminiError) {
          console.error('Gemini fallback also failed:', geminiError);
          throw new Error(
            this.sanitizeErrorMessage(error instanceof Error ? error : new Error('Unknown error'), 'document compatibility validation')
          );
        }
      }
      
      // If not a connectivity error, throw sanitized error
      throw new Error(
        this.sanitizeErrorMessage(error instanceof Error ? error : new Error('Unknown error'), 'document compatibility validation')
      );
    }
  }

  /**
   * Generate actionable insights from financial comparisons
   * Automatically falls back to Gemini if OpenAI connectivity fails
   */
  async generateComparisonInsights(
    metrics: ExtractedMetrics[],
  ): Promise<ComparisonInsights> {
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
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are a financial analyst expert. Generate actionable insights from financial comparisons.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const result = JSON.parse(
        response.choices[0].message.content ||
          '{"insights": [], "summary": ""}',
      );
      return result as ComparisonInsights;
    } catch (error) {
      console.error("OpenAI insights generation error:", error);
      
      // Fall back to Gemini if it's a connectivity error
      if (this.isConnectivityError(error)) {
        console.log('OpenAI connectivity failed, falling back to Gemini for insights generation');
        try {
          return await geminiService.generateComparisonInsights(metrics);
        } catch (geminiError) {
          console.error('Gemini fallback also failed:', geminiError);
          throw new Error(
            this.sanitizeErrorMessage(error instanceof Error ? error : new Error('Unknown error'), 'comparison insights generation')
          );
        }
      }
      
      // If not a connectivity error, throw sanitized error
      throw new Error(
        this.sanitizeErrorMessage(error instanceof Error ? error : new Error('Unknown error'), 'comparison insights generation')
      );
    }
  }
}

export const openaiService = new OpenAIService();
