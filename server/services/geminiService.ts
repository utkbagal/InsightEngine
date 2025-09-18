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
    
    // Detect period with enhanced patterns
    let period = null;
    
    // Enhanced year matching - handle F26, FY26, F2026, 2025, etc.
    const yearMatch = textLower.match(/(?:20\d{2})|(?:f(?:y)?(\d{2}))|(?:fy\s*(\d{2}))/);
    let year = null;
    if (yearMatch) {
      if (yearMatch[0].startsWith('20')) {
        // Standard 4-digit year (2025)
        year = yearMatch[0];
      } else if (yearMatch[1] || yearMatch[2]) {
        // F26, FY26 format - convert to full year
        const shortYear = yearMatch[1] || yearMatch[2];
        year = `20${shortYear}`;
      }
    }
    
    // Enhanced quarter matching
    let quarter = null;
    
    // Direct quarter patterns: Q1, Q2, Quarter 1, etc.
    const directQuarterMatch = textLower.match(/q([1-4])|quarter\s*([1-4])/);
    if (directQuarterMatch) {
      quarter = directQuarterMatch[1] || directQuarterMatch[2];
    }
    
    // Date-based quarter detection: "quarter ended 30th June 2025"
    if (!quarter) {
      const dateQuarterMatch = textLower.match(/(?:quarter|three\s+months)\s+ended\s+(?:\d{1,2}(?:st|nd|rd|th)?\s+)?([a-z]+)\s+(\d{4})/);
      if (dateQuarterMatch) {
        const month = dateQuarterMatch[1].toLowerCase();
        // Map months to quarters
        if (['january', 'february', 'march', 'jan', 'feb', 'mar'].includes(month)) {
          quarter = '4'; // Q4 of previous fiscal year ends in March
        } else if (['april', 'may', 'june', 'apr', 'may', 'jun'].includes(month)) {
          quarter = '1'; // Q1 ends in June
        } else if (['july', 'august', 'september', 'jul', 'aug', 'sep'].includes(month)) {
          quarter = '2'; // Q2 ends in September
        } else if (['october', 'november', 'december', 'oct', 'nov', 'dec'].includes(month)) {
          quarter = '3'; // Q3 ends in December
        }
        
        // Use year from date if available and no year found yet
        if (!year && dateQuarterMatch[2]) {
          year = dateQuarterMatch[2];
        }
      }
    }
    
    // Additional pattern: "Q1 F26" format
    const combinedMatch = textLower.match(/q([1-4])\s+f(?:y)?(\d{2})/);
    if (combinedMatch) {
      quarter = combinedMatch[1];
      year = `20${combinedMatch[2]}`;
    }
    
    // Construct period string
    if (quarter && year) {
      period = `Q${quarter} ${year}`;
    } else if (year) {
      period = `FY ${year}`;
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

  // Keep the original method for backward compatibility
  async extractFinancialMetrics(
    text: string,
    validatedCompanyName: string
  ): Promise<ExtractedMetrics> {
    // This method is deprecated but kept for compatibility
    // In practice, we should use extractFinancialMetricsFromDocument
    throw new Error('Text-based extraction deprecated. Use extractFinancialMetricsFromDocument instead.');
  }

  async extractFinancialMetricsFromDocument(
    documentBuffer: Buffer,
    mimeType: string,
    validatedCompanyName: string
  ): Promise<ExtractedMetrics> {
    console.log(`Direct document analysis starting for ${validatedCompanyName} with ${mimeType} document`);

    const prompt = `
    You are an expert financial analyst. Analyze this ${mimeType} financial document and extract key financial metrics, paying special attention to TABLES and structured data.
    
    **EXTRACTION STRATEGY FOR TABULAR DATA**:
    1. FIRST scan for financial tables (Income Statement, Balance Sheet, Cash Flow)
    2. Look for row headers with financial metrics and corresponding numerical values
    3. Tables often have format: "Metric Name | Current Period | Previous Period"
    4. Pay attention to table headers indicating scale (Millions, Thousands, Crores, etc.)
    5. Extract values from the most recent period column
    
    **SEARCH PATTERNS IN TABLES AND TEXT**:
    
    **REVENUE** (in tables look for rows with):
    - "Total revenue", "Net revenue", "Revenue", "Net sales", "Sales", "Total income"
    - "Operating revenue", "Revenue from operations", "Turnover"
    - Row may be at top of income statement table
    
    **NET INCOME** (in tables look for rows with):
    - "Net profit", "Net income", "Profit after tax", "PAT"
    - "Net earnings", "Profit for the period/year"
    - Usually at bottom of income statement table
    
    **BALANCE SHEET ITEMS** (look for in balance sheet tables):
    - "Total assets", "Current assets", "Non-current assets"
    - "Current liabilities", "Non-current liabilities"
    - "Shareholders' equity", "Total equity", "Net worth"
    - "Long-term borrowings", "Short-term borrowings", "Total debt"
    - "Cash and cash equivalents", "Cash and bank balances"
    
    **OTHER FINANCIAL METRICS** (in various tables):
    - "Gross profit", "Operating profit/loss", "EBITDA"
    - "PAT", "Profit After Tax" (may be same as net income but extract separately if available)
    - "Share capital", "Reserves and surplus"
    - "Number of shares", "Weighted average shares"
    
    **SALES VOLUME METRICS** (look for in operating or key metrics sections):
    - "Units sold", "Volume sold", "Sales volume", "Number of units"
    - "Total vehicles sold", "Production volume", "Quantity sold"
    - Usually found in operating metrics or key performance indicators
    
    **CRITICAL EXTRACTION RULES FOR INDIAN FINANCIAL DOCUMENTS**:
    1. **Currency Conversion**: For INR values, convert to USD using rate 1 USD = 83 INR
    2. **Scale Conversion**: 
       - If document shows "in Crores" → multiply by 10 million, then divide by 1000 to get billions USD
       - If document shows "in Millions" → divide by 1000 to get billions USD
       - If document shows "in Thousands" → divide by 1,000,000 to get billions USD
       - If document shows "in Lakhs" → multiply by 100,000, then convert currency and scale
    3. **Table Recognition**: Look specifically for:
       - Income Statement tables with rows for Revenue, Net Profit, Operating Income
       - Balance Sheet tables with rows for Total Assets, Shareholders' Equity, Debt
       - Tables with multiple columns showing Current Quarter vs Previous Year
    4. **Indian Terminology**: 
       - "PAT" = Profit After Tax = Net Income
       - "Revenue from operations" = Revenue
       - "Total comprehensive income" = Net Income
       - "Net worth" = Shareholders' Equity
    5. **Data Quality**: 
       - Extract ACTUAL NUMBERS from tables, not text descriptions
       - Use confidence 0.95 for clearly visible table values
       - Use confidence 0.3 or lower for unclear or estimated values
    6. **Evidence**: Provide the exact table cell content where each value was found
    7. **MANDATORY**: If you see tabular financial data, you MUST extract the core metrics (revenue, net income, total assets). Return null only if genuinely absent.
    
    **FISCAL YEAR PATTERN RECOGNITION**:
    - "Q1 F26" means Q1 of fiscal year 2026
    - "F26", "FY26", "F2026" means fiscal year 2026  
    - "quarter ended 30th June 2025" means Q1 of fiscal year 2026 (Indian companies)
    - "three months ended [date]" indicates quarterly report
    
    **QUARTER MAPPING FOR INDIAN FISCAL YEAR (April-March):**
    - Q1: April-June (quarter ending June)
    - Q2: July-September (quarter ending September)  
    - Q3: October-December (quarter ending December)
    - Q4: January-March (quarter ending March)
    
    Return JSON format with confidence and evidence:
    {
      "companyName": "${validatedCompanyName}",
      "period": "string (e.g., Q1 2026, FY 2026, June 30, 2025)",
      "year": number,
      "quarter": "string (Q1, Q2, Q3, Q4) or null for annual",
      "revenue": number (in billions USD),
      "netIncome": number (in billions USD),
      "grossProfit": number (in billions USD),
      "operatingIncome": number (in billions USD),
      "ebitda": number (in billions USD),
      "pat": number (in billions USD, may be same as netIncome but extract separately if explicitly mentioned),
      "salesVolume": number (in millions of units sold),
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
        "revenue": "exact table row/cell text where revenue was found",
        "netIncome": "exact table row/cell text where net income was found",
        "totalAssets": "exact table row/cell text where total assets was found",
        "shareholdersEquity": "exact table row/cell text where equity was found"
      },
      "extractionMethod": "ai-only"
    }
    
    Please analyze the uploaded document and extract all available financial metrics.
    `;

    try {
      const contents = [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: documentBuffer.toString("base64"),
                mimeType: mimeType,
              },
            },
            {
              text: `You are a financial analyst expert specializing in quarterly earnings reports and financial statements. Your task is to meticulously extract financial metrics from the document. Search thoroughly and convert all values to billions USD.\n\n${prompt}`
            }
          ]
        }
      ];

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: 6000
        },
        contents: contents
      });
      
      const jsonText = response.text;
      
      if (!jsonText) {
        throw new Error('Empty response from Gemini');
      }

      let aiResult;
      try {
        console.log(`Raw Gemini response for ${validatedCompanyName}:`, jsonText);
        const parsed = JSON.parse(jsonText);
        
        // Handle case where Gemini returns an array instead of a single object
        aiResult = Array.isArray(parsed) ? parsed[0] : parsed;
        console.log(`Parsed Gemini result for ${validatedCompanyName}:`, JSON.stringify(aiResult, null, 2));
      } catch (parseError) {
        console.error('Failed to parse Gemini JSON response:', parseError);
        console.error('Raw response:', jsonText);
        throw new Error('AI response was not valid JSON format');
      }
      
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
    Analyze the following financial documents for compatibility. **BE EXTREMELY PERMISSIVE** - almost always mark as compatible:
    
    **MARK AS COMPATIBLE IF:**
    - Document contains ANY financial numbers (revenue, sales, profit, etc.)
    - Document appears to be from a business/financial context  
    - Data can potentially be extracted and normalized for comparison
    - Document is from any reasonable time period (within 2 years)
    - Document is partial/truncated but contains some financial data
    
    **ONLY MARK AS INCOMPATIBLE IF:**
    - Document contains NO financial data whatsoever
    - Document is completely unrelated to business/finance
    - Document is severely corrupted or unreadable
    
    **FISCAL YEAR PATTERNS (for reference only):**
    - "Q1 F26" means Q1 of fiscal year 2026
    - Indian fiscal year: April-March (Q1: Apr-Jun, Q2: Jul-Sep, Q3: Oct-Dec, Q4: Jan-Mar)
    
    **DEFAULT TO COMPATIBLE**: When in doubt, mark as compatible. The system will handle data extraction and normalization.
    
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