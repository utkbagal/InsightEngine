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
    You are an expert financial analyst. Extract key financial metrics from this quarterly/annual financial document.
    
    SEARCH CAREFULLY for these specific terms and variations:
    
    **REVENUE** (look for):
    - "Total revenues", "Net revenues", "Revenue", "Net sales", "Sales", "Total income", "Operating revenues"
    - May appear in: Income Statement, Consolidated Statement of Operations, Statement of Earnings
    
    **NET INCOME** (look for):
    - "Net income", "Net earnings", "Profit", "Net profit", "Earnings after tax", "Net income attributable to"
    - Often the bottom line of income statement
    
    **PERIOD INFORMATION** (look for):
    - "Three months ended", "Quarter ended", "For the period ended", "Fiscal year ended"
    - Date formats: "March 31, 2024", "Q1 2024", "FY 2024"
    
    **TOTAL ASSETS** (look for):
    - "Total assets", "Total consolidated assets", Balance sheet totals
    
    **CASH & EQUIVALENTS** (look for):
    - "Cash and cash equivalents", "Cash and short-term investments", "Cash"
    
    **DEBT** (look for):
    - "Total debt", "Long-term debt", "Short-term debt", "Borrowings", "Total borrowings"
    
    **IMPORTANT INSTRUCTIONS**:
    1. Convert ALL monetary values to BILLIONS USD (divide by 1000 if in millions, by 1,000,000 if in thousands)
    2. Look for currency indicators (₹, Rs, INR for Indian Rupees - convert to USD using approximate rate 1 USD = 83 INR)
    3. If you find "in millions" or "in thousands" in headers, adjust accordingly
    4. Search the ENTIRE document - don't give up if not found immediately
    5. For quarterly data, extract the specific quarter (Q1, Q2, Q3, Q4)
    6. Calculate profit margin if revenue and net income are available: (net_income/revenue) * 100
    
    Return JSON format:
    {
      "companyName": "${validatedCompanyName}",
      "period": "string (e.g., Q1 2024, FY 2024)",
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
      "rawMetrics": {"extracted_values": "any additional financial data found"}
    }
    
    Document text:
    ${text.slice(0, 15000)}
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
          maxOutputTokens: 3000
        },
        contents: `You are a financial analyst expert specializing in quarterly earnings reports and financial statements. Your task is to meticulously extract financial metrics from the document. Search thoroughly and convert all values to billions USD.\n\n${prompt}`
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