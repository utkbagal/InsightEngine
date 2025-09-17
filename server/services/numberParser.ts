/**
 * Robust number extraction and parsing utilities for financial documents
 * Implements heuristic pre-extraction to improve AI extraction accuracy
 */

export interface ExtractedNumber {
  value: number;
  originalText: string;
  confidence: number;
  unit: string;
  currency: string;
  source: 'heuristic' | 'ai';
  evidenceSnippet: string;
}

export interface FinancialContext {
  documentScale: 'thousands' | 'millions' | 'billions' | 'crores' | 'lakhs' | 'units';
  currency: 'USD' | 'INR' | 'EUR' | 'GBP' | 'unknown';
  period: string | null;
  isQuarterly: boolean;
}

export class NumberParser {
  // Common financial terms and their regex patterns
  private static readonly FINANCIAL_PATTERNS = {
    revenue: /(?:total\s+)?(?:net\s+)?(?:revenues?|sales|income\s+from\s+operations|operating\s+revenues?)/i,
    netIncome: /(?:net\s+(?:income|earnings|profit)|profit\s+after\s+tax|earnings\s+after\s+tax)/i,
    totalAssets: /total\s+assets/i,
    cash: /cash\s+(?:and\s+)?(?:cash\s+)?equivalents?/i,
    debt: /(?:total\s+)?(?:debt|borrowings)/i,
    ebitda: /ebitda/i,
    grossProfit: /gross\s+profit/i,
    operatingIncome: /operating\s+(?:income|profit)/i,
    sharesOutstanding: /(?:shares?\s+outstanding|outstanding\s+shares?)/i,
    bookValue: /(?:book\s+value|shareholders?\s+equity|stockholders?\s+equity)/i
  };

  // Currency symbols and indicators
  private static readonly CURRENCY_PATTERNS = {
    USD: /(?:\$|USD|US\s*\$|dollars?)/i,
    INR: /(?:₹|INR|Rs\.?|rupees?)/i,
    EUR: /(?:€|EUR|euros?)/i,
    GBP: /(?:£|GBP|pounds?)/i
  };

  // Scale indicators
  private static readonly SCALE_PATTERNS = {
    thousands: /(?:in\s+)?thousands?/i,
    millions: /(?:in\s+)?millions?/i,
    billions: /(?:in\s+)?billions?/i,
    crores: /(?:in\s+)?crores?/i,
    lakhs: /(?:in\s+)?lakhs?/i
  };

  // Number patterns including parentheses for negatives
  private static readonly NUMBER_PATTERN = /(?:\()?\s*[\d,]+\.?\d*\s*(?:\))?/g;

  /**
   * Detect document-wide context (scale, currency, period)
   */
  static detectDocumentContext(text: string): FinancialContext {
    const context: FinancialContext = {
      documentScale: 'units',
      currency: 'unknown',
      period: null,
      isQuarterly: false
    };

    // Detect scale
    for (const [scale, pattern] of Object.entries(this.SCALE_PATTERNS)) {
      if (pattern.test(text)) {
        context.documentScale = scale as any;
        break;
      }
    }

    // Detect currency  
    for (const [currency, pattern] of Object.entries(this.CURRENCY_PATTERNS)) {
      if (pattern.test(text)) {
        context.currency = currency as any;
        break;
      }
    }

    // Detect period
    const periodMatch = text.match(/(?:three\s+months\s+ended|quarter\s+ended|for\s+the\s+period\s+ended|fiscal\s+year\s+ended)\s*([^.]*)/i);
    if (periodMatch) {
      context.period = periodMatch[1].trim();
      context.isQuarterly = /quarter|three\s+months/i.test(periodMatch[0]);
    }

    return context;
  }

  /**
   * Extract financial numbers using heuristic pattern matching
   */
  static extractFinancialNumbers(text: string, context: FinancialContext): Map<string, ExtractedNumber[]> {
    const results = new Map<string, ExtractedNumber[]>();

    for (const [metric, pattern] of Object.entries(this.FINANCIAL_PATTERNS)) {
      const numbers = this.findNumbersForMetric(text, pattern, metric, context);
      if (numbers.length > 0) {
        results.set(metric, numbers);
      }
    }

    return results;
  }

  /**
   * Find numbers associated with a specific financial metric
   */
  private static findNumbersForMetric(
    text: string, 
    metricPattern: RegExp, 
    metricName: string,
    context: FinancialContext
  ): ExtractedNumber[] {
    const results: ExtractedNumber[] = [];
    const sentences = text.split(/[.!?]+/);

    for (const sentence of sentences) {
      if (metricPattern.test(sentence)) {
        const numbers = this.extractNumbersFromText(sentence, context);
        
        for (const number of numbers) {
          results.push({
            ...number,
            source: 'heuristic',
            evidenceSnippet: sentence.trim().slice(0, 150),
            confidence: this.calculateConfidence(sentence, metricName, number.value)
          });
        }
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Extract and parse numbers from text with proper unit handling
   */
  private static extractNumbersFromText(text: string, context: FinancialContext): ExtractedNumber[] {
    const numbers: ExtractedNumber[] = [];
    const matches = text.match(this.NUMBER_PATTERN);

    if (!matches) return numbers;

    for (const match of matches) {
      const cleanMatch = match.replace(/[,\s]/g, '');
      const isNegative = /^\(.*\)$/.test(match.trim());
      
      let numericValue = parseFloat(cleanMatch.replace(/[()]/g, ''));
      if (isNegative) numericValue = -numericValue;

      if (isNaN(numericValue)) continue;

      // Convert to billions USD based on context
      const convertedValue = this.convertToBillionsUSD(numericValue, context);

      numbers.push({
        value: convertedValue,
        originalText: match.trim(),
        confidence: 0.7, // Base confidence for heuristic extraction
        unit: context.documentScale,
        currency: context.currency,
        source: 'heuristic',
        evidenceSnippet: text.slice(0, 100)
      });
    }

    return numbers;
  }

  /**
   * Convert value to billions USD
   */
  private static convertToBillionsUSD(value: number, context: FinancialContext): number {
    let converted = value;

    // Scale conversion
    switch (context.documentScale) {
      case 'thousands':
        converted = value / 1000000; // thousands to billions
        break;
      case 'millions':
        converted = value / 1000; // millions to billions
        break;
      case 'billions':
        converted = value; // already in billions
        break;
      case 'crores':
        converted = value / 100; // crores to billions (1 crore = 10 million = 0.01 billion)
        break;
      case 'lakhs':
        converted = value / 10000; // lakhs to billions (1 lakh = 100,000 = 0.0001 billion)
        break;
      default:
        converted = value / 1000000000; // units to billions
    }

    // Currency conversion (approximate rates)
    switch (context.currency) {
      case 'INR':
        converted = converted / 83; // 1 USD = 83 INR (approximate)
        break;
      case 'EUR':
        converted = converted * 1.1; // 1 EUR = 1.1 USD (approximate)
        break;
      case 'GBP':
        converted = converted * 1.25; // 1 GBP = 1.25 USD (approximate)
        break;
      case 'USD':
      default:
        // Already in USD or unknown currency
        break;
    }

    return Math.round(converted * 1000) / 1000; // Round to 3 decimal places
  }

  /**
   * Calculate confidence score for extracted number
   */
  private static calculateConfidence(
    sentence: string, 
    metricName: string, 
    value: number
  ): number {
    let confidence = 0.7; // Base confidence

    // Boost confidence for typical financial value ranges
    if (value > 0.001 && value < 10000) confidence += 0.1;
    
    // Boost for clear financial language
    if (/(?:revenue|income|profit|loss|assets|debt)/i.test(sentence)) confidence += 0.1;
    
    // Reduce for very small or very large numbers that seem unlikely
    if (value < 0.0001 || value > 100000) confidence -= 0.2;
    
    // Boost for specific metric matches
    if (sentence.toLowerCase().includes(metricName.toLowerCase())) confidence += 0.1;

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Merge heuristic and AI-extracted results
   */
  static mergeExtractionResults(
    heuristicResults: Map<string, ExtractedNumber[]>,
    aiResult: any
  ): any {
    const merged = { ...aiResult };

    for (const [metric, numbers] of Array.from(heuristicResults.entries())) {
      if (numbers.length > 0) {
        const bestNumber = numbers[0]; // Highest confidence
        
        // Use heuristic result if AI didn't find anything or has low confidence
        const aiValue = merged[metric];
        if (!aiValue || aiValue === 0 || aiValue === null) {
          merged[metric] = bestNumber.value;
          merged[`${metric}_confidence`] = bestNumber.confidence;
          merged[`${metric}_evidence`] = bestNumber.evidenceSnippet;
        }
      }
    }

    return merged;
  }
}