import { AzureOpenAI } from "openai";
import { geminiService } from "./geminiService";

// Using Azure OpenAI API
const openai = new AzureOpenAI({
  apiVersion: "2024-12-01-preview",
  endpoint: "https://vibeathon2025.openai.azure.com",
  apiKey: process.env.OPENAI_API_KEY || "default_key"
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
      .replace(/openai|gpt-5-mini|api key|gemini/gi, 'AI service')
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
        model: "gpt-5-mini",
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
        max_completion_tokens: 100
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
      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a financial analyst expert specializing in quarterly earnings reports and financial statements. Your task is to meticulously extract financial metrics from the document. Search thoroughly and convert all values to billions USD.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 2000,
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
    Analyze the following financial documents for compatibility. **BE VERY PERMISSIVE** - mark as compatible unless truly impossible to compare:
    
    **MARK AS COMPATIBLE IF:**
    - Document contains ANY financial numbers (revenue, sales, profit, etc.)
    - Document appears to be from a business/financial context
    - Data can potentially be extracted and normalized for comparison
    - Document is from any reasonable time period (within 2 years)
    
    **ONLY MARK AS INCOMPATIBLE IF:**
    - Document contains NO financial data whatsoever
    - Document is completely unrelated to business/finance
    - Document is severely corrupted or unreadable
    
    **ALWAYS PREFER EXTRACTION**: Focus on data extraction and unit normalization rather than strict compatibility. Different document types, periods, currencies, and formats are acceptable - the system will handle normalization.
    
    Return a JSON object with compatibility analysis for each document:
    {
      "documents": [
        {
          "compatible": true,
          "period": "string",
          "year": number,
          "quarter": "string or null",
          "documentType": "string",
          "issues": ["warnings only - not blocking issues"]
        }
      ]
    }

    Documents:
    ${documents.map((doc, idx) => `Document ${idx + 1} (${doc.companyName}):\n${doc.text.slice(0, 2000)}\n\n`).join("")}
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
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
        model: "gpt-5-mini",
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
          console.log('Both AI services failed, generating basic comparison insights without AI');
          return this.generateBasicInsights(metrics);
        }
      }
      
      // If not a connectivity error, throw sanitized error
      throw new Error(
        this.sanitizeErrorMessage(error instanceof Error ? error : new Error('Unknown error'), 'comparison insights generation')
      );
    }
  }

  /**
   * Generate basic insights without AI when both services are unavailable
   */
  private generateBasicInsights(metrics: ExtractedMetrics[]): ComparisonInsights {
    console.log('Generating basic comparison insights without AI for', metrics.length, 'companies');
    
    const insights: Array<{
      type: "revenue" | "profitability" | "growth" | "risk" | "efficiency";
      title: string;
      description: string;
      impact: "positive" | "negative" | "neutral";
      companies: string[];
    }> = [];
    
    if (metrics.length < 2) {
      return {
        insights: [],
        summary: "Insufficient data for comparison analysis."
      };
    }

    const companiesWithData = metrics.filter(m => m.revenue !== null && m.revenue !== undefined);
    
    // Revenue comparison
    if (companiesWithData.length >= 2) {
      const sortedByRevenue = [...companiesWithData].sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
      const highest = sortedByRevenue[0];
      const lowest = sortedByRevenue[sortedByRevenue.length - 1];
      
      if (highest && lowest && highest.revenue && lowest.revenue) {
        const revenueDiff = ((highest.revenue - lowest.revenue) / lowest.revenue * 100).toFixed(1);
        insights.push({
          type: "revenue",
          title: "Revenue Leadership",
          description: `${highest.companyName} leads with ${highest.revenue}B in revenue, ${revenueDiff}% higher than ${lowest.companyName} (${lowest.revenue}B).`,
          impact: "positive",
          companies: [highest.companyName, lowest.companyName]
        });
      }
    }

    // Profitability comparison
    const companiesWithProfit = metrics.filter(m => m.netIncome !== null && m.netIncome !== undefined);
    if (companiesWithProfit.length >= 2) {
      const sortedByProfit = [...companiesWithProfit].sort((a, b) => (b.netIncome || 0) - (a.netIncome || 0));
      const mostProfitable = sortedByProfit[0];
      const leastProfitable = sortedByProfit[sortedByProfit.length - 1];
      
      if (mostProfitable && leastProfitable && mostProfitable.netIncome && leastProfitable.netIncome) {
        insights.push({
          type: "profitability", 
          title: "Profitability Analysis",
          description: `${mostProfitable.companyName} shows highest profitability with ${mostProfitable.netIncome}B net income vs ${leastProfitable.companyName}'s ${leastProfitable.netIncome}B.`,
          impact: mostProfitable.netIncome > 0 ? "positive" : "neutral",
          companies: [mostProfitable.companyName, leastProfitable.companyName]
        });
      }
    }

    // Growth analysis
    const companiesWithGrowth = metrics.filter(m => m.yoyGrowth !== null && m.yoyGrowth !== undefined);
    if (companiesWithGrowth.length >= 2) {
      const sortedByGrowth = [...companiesWithGrowth].sort((a, b) => (b.yoyGrowth || 0) - (a.yoyGrowth || 0));
      const fastestGrowing = sortedByGrowth[0];
      
      if (fastestGrowing && fastestGrowing.yoyGrowth) {
        insights.push({
          type: "growth",
          title: "Growth Performance", 
          description: `${fastestGrowing.companyName} shows strongest growth momentum at ${fastestGrowing.yoyGrowth}% year-over-year.`,
          impact: fastestGrowing.yoyGrowth > 0 ? "positive" : "negative",
          companies: [fastestGrowing.companyName]
        });
      }
    }

    // EBITDA comparison if available
    const companiesWithEbitda = metrics.filter(m => m.ebitda !== null && m.ebitda !== undefined);
    if (companiesWithEbitda.length >= 2) {
      const sortedByEbitda = [...companiesWithEbitda].sort((a, b) => (b.ebitda || 0) - (a.ebitda || 0));
      const highest = sortedByEbitda[0];
      
      if (highest && highest.ebitda) {
        insights.push({
          type: "efficiency",
          title: "Operational Efficiency",
          description: `${highest.companyName} shows strong operational performance with ${highest.ebitda}B EBITDA, indicating efficient business operations.`,
          impact: "positive", 
          companies: [highest.companyName]
        });
      }
    }

    // Generate summary
    const companyNames = metrics.map(m => m.companyName).join(", ");
    const summary = `Basic comparison analysis for ${companyNames}. ${insights.length} key insights identified across revenue, profitability, and growth metrics. Note: This analysis was generated using simplified calculations when advanced AI analysis was unavailable.`;

    return {
      insights,
      summary
    };
  }
}

export const openaiService = new OpenAIService();
