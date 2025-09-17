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
   * Analyze document context for enhanced extraction
   */
  private analyzeDocumentContext(text: string): {
    type: string;
    scale: string;
    currency: string;
    period: string | null;
  } {
    const textLower = text.toLowerCase();
    
    // Detect document type
    let type = 'unknown';
    if (textLower.includes('10-k') || textLower.includes('annual report')) type = 'annual';
    else if (textLower.includes('10-q') || textLower.includes('quarterly')) type = 'quarterly';
    else if (textLower.includes('earnings')) type = 'earnings';
    
    // Detect scale
    let scale = 'billions';
    if (textLower.includes('in millions') || textLower.includes('(in millions)')) scale = 'millions';
    else if (textLower.includes('in thousands') || textLower.includes('(in thousands)')) scale = 'thousands';
    
    // Detect currency
    let currency = 'USD';
    if (textLower.includes('inr') || textLower.includes('₹') || textLower.includes('rupees')) currency = 'INR';
    else if (textLower.includes('eur') || textLower.includes('€')) currency = 'EUR';
    else if (textLower.includes('gbp') || textLower.includes('£')) currency = 'GBP';
    
    // Detect period
    let period = null;
    const yearMatch = textLower.match(/20\d{2}/);
    const quarterMatch = textLower.match(/q([1-4])|quarter\s*([1-4])/);
    if (quarterMatch && yearMatch) {
      const qNum = quarterMatch[1] || quarterMatch[2];
      period = `Q${qNum} ${yearMatch[0]}`;
    } else if (yearMatch) {
      period = `FY ${yearMatch[0]}`;
    }
    
    return { type, scale, currency, period };
  }

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
    // Enhanced AI-first extraction - analyze document context first
    const documentContext = this.analyzeDocumentContext(text);
    
    console.log(`Pure AI extraction starting for ${validatedCompanyName} with context:`, {
      documentType: documentContext.type,
      scale: documentContext.scale,
      currency: documentContext.currency,
      period: documentContext.period
    });

    const prompt = `
    You are an expert financial analyst. Extract key financial metrics from this quarterly/annual financial document.
    
    DOCUMENT CONTEXT DETECTED:
    - Document Type: ${documentContext.type}
    - Scale: ${documentContext.scale}
    - Currency: ${documentContext.currency}
    - Period: ${documentContext.period || 'Not detected'}
    
    SEARCH CAREFULLY for these specific terms and variations:
    
    **REVENUE** (look for):
    - "Total revenues", "Net revenues", "Revenue", "Net sales", "Sales", "Total income", "Operating revenues"
    - May appear in: Income Statement, Consolidated Statement of Operations, Statement of Earnings
    
    **NET INCOME** (look for):
    - "Net income", "Net earnings", "Profit", "Net profit", "Earnings after tax", "Net income attributable to"
    - Often the bottom line of income statement
    
    **ADDITIONAL METRICS FOR RATIO CALCULATIONS** (look for):
    - "Gross profit", "Operating income/profit", "EBITDA"
    - "Shareholders' equity", "Book value", "Total equity"
    - "Shares outstanding", "Weighted average shares"
    - "Current assets", "Current liabilities"
    - "Long-term debt", "Short-term debt", "Total debt"
    
    **PERIOD INFORMATION** (look for):
    - "Three months ended", "Quarter ended", "For the period ended", "Fiscal year ended"
    - Date formats: "March 31, 2024", "Q1 2024", "FY 2024"
    
    **CRITICAL INSTRUCTIONS**:
    1. Convert ALL monetary values to BILLIONS USD (divide by 1000 if in millions, by 1,000,000 if in thousands)
    2. Look for currency indicators (₹, Rs, INR for Indian Rupees - convert to USD using rate 1 USD = 83 INR)
    3. If you find "in millions" or "in thousands" in headers, adjust accordingly
    4. Search the ENTIRE document methodically - check tables, footnotes, summaries
    5. For quarterly data, extract the specific quarter (Q1, Q2, Q3, Q4)
    6. Include confidence score (0-1) for each extracted value
    7. Provide evidence snippet (max 100 chars) showing where you found each value
    8. If you cannot find a metric, return null (DO NOT fabricate or guess)
    
    Return JSON format with confidence and evidence:
    {
      "companyName": "${validatedCompanyName}",
      "period": "string (e.g., Q1 2024, FY 2024)",
      "year": number,
      "quarter": "string (Q1, Q2, Q3, Q4) or null for annual",
      "revenue": number (in billions USD),
      "netIncome": number (in billions USD),
      "grossProfit": number (in billions USD),
      "operatingIncome": number (in billions USD),
      "ebitda": number (in billions USD),
      "totalAssets": number (in billions USD),
      "currentAssets": number (in billions USD),
      "currentLiabilities": number (in billions USD),
      "totalDebt": number (in billions USD),
      "longTermDebt": number (in billions USD),
      "cashEquivalents": number (in billions USD),
      "shareholdersEquity": number (in billions USD),
      "sharesOutstanding": number (in millions of shares),
      "profitMargin": number (as percentage),
      "yoyGrowth": number (as percentage),
      "confidence": {
        "revenue": number (0-1),
        "netIncome": number (0-1),
        "overall": number (0-1)
      },
      "evidence": {
        "revenue": "text snippet showing where revenue was found",
        "netIncome": "text snippet showing where net income was found"
      },
      "extractionMethod": "ai-only"
    }
    
    Document text:
    ${text.slice(0, 18000)}
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
          maxOutputTokens: 4000
        },
        contents: `You are a financial analyst expert specializing in quarterly earnings reports and financial statements. Your task is to meticulously extract financial metrics from the document. Search thoroughly and convert all values to billions USD.\n\n${prompt}`
      });
      
      const jsonText = response.text;
      
      if (!jsonText) {
        throw new Error('Empty response from Gemini');
      }

      const aiResult = JSON.parse(jsonText);
      
      // Step 2: Calculate financial ratios from AI extracted metrics
      const { RatioCalculator } = await import('./ratioCalculator');
      const calculatedRatios = RatioCalculator.calculateAllRatios(aiResult);
      const validatedRatios = RatioCalculator.validateRatios(calculatedRatios);
      
      // Step 3: Combine AI results with calculated ratios
      const finalResult = {
        ...aiResult,
        ...validatedRatios,
        companyName: validatedCompanyName,
        extractionMethod: 'ai-only',
        extractionConfidence: aiResult.confidence?.overall || 0.8,
        dataSource: 'document'
      };

      console.log(`Pure AI extraction completed for ${validatedCompanyName}:`, {
        aiExtracted: Object.keys(aiResult).length,
        ratiosCalculated: Object.values(validatedRatios).filter(v => v !== null).length,
        overallConfidence: finalResult.extractionConfidence
      });
      
      return finalResult as ExtractedMetrics;
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