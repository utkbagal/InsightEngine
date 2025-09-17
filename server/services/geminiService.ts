import { GoogleGenAI } from "@google/genai";
import type { 
  ExtractedMetrics, 
  DocumentCompatibility, 
  ComparisonInsights 
} from "./openaiService";

// DON'T DELETE THIS COMMENT - Using blueprint:javascript_gemini
// Using Gemini API as OpenAI fallback
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export class GeminiService {
  /**
   * Sanitize error messages for client consumption
   */
  private sanitizeErrorMessage(error: Error, context: string): string {
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
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `You are a financial analyst expert. Extract company names objectively from financial documents. Return only the company name or null.\n\n${prompt}`,
      });
      
      const extractedName = response.text?.trim();
      
      return extractedName && extractedName.toLowerCase() !== 'null' ? extractedName : null;
    } catch (error) {
      console.error('Gemini company name extraction error:', error);
      throw new Error(
        this.sanitizeErrorMessage(error instanceof Error ? error : new Error('Unknown error'), 'company name extraction')
      );
    }
  }

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
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: 2000
        },
        contents: `You are a financial analyst expert. Extract financial metrics from documents and return structured JSON data.\n\n${prompt}`
      });
      
      const jsonText = response.text;
      
      if (!jsonText) {
        throw new Error('Empty response from Gemini');
      }

      const parsedResult = JSON.parse(jsonText);
      
      // Override with validated company name to prevent bias
      parsedResult.companyName = validatedCompanyName;
      
      return parsedResult as ExtractedMetrics;
    } catch (error) {
      console.error('Gemini extraction error:', error);
      throw new Error(
        this.sanitizeErrorMessage(error instanceof Error ? error : new Error('Unknown error'), 'financial metrics extraction')
      );
    }
  }

  async validateDocumentCompatibility(documents: Array<{ text: string, companyName: string }>): Promise<DocumentCompatibility[]> {
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
    ${documents.map((doc, idx) => `Document ${idx + 1} (${doc.companyName}):\n${doc.text.slice(0, 2000)}\n\n`).join('')}
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        config: {
          responseMimeType: "application/json",
          temperature: 0.1
        },
        contents: `You are a financial analyst expert. Analyze document compatibility for financial comparisons.\n\n${prompt}`
      });
      
      const jsonText = response.text;
      
      if (!jsonText) {
        throw new Error('Empty response from Gemini');
      }

      const parsedResult = JSON.parse(jsonText);
      return parsedResult.documents || [];
    } catch (error) {
      console.error('Gemini compatibility check error:', error);
      throw new Error(
        this.sanitizeErrorMessage(error instanceof Error ? error : new Error('Unknown error'), 'document compatibility validation')
      );
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
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        config: {
          responseMimeType: "application/json",
          temperature: 0.3
        },
        contents: `You are a financial analyst expert. Generate actionable insights from financial comparisons.\n\n${prompt}`
      });
      
      const jsonText = response.text;
      
      if (!jsonText) {
        throw new Error('Empty response from Gemini');
      }

      const parsedResult = JSON.parse(jsonText);
      return parsedResult as ComparisonInsights;
    } catch (error) {
      console.error('Gemini insights generation error:', error);
      throw new Error(
        this.sanitizeErrorMessage(error instanceof Error ? error : new Error('Unknown error'), 'comparison insights generation')
      );
    }
  }
}

export const geminiService = new GeminiService();