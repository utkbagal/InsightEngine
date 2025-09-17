export interface KPISynonymMap {
  [key: string]: string[];
}

export class KPINormalizer {
  private synonymMap: KPISynonymMap = {
    'revenue': [
      'total revenue',
      'net revenue', 
      'operating revenue',
      'total net sales',
      'net sales',
      'sales',
      'total sales',
      'revenues'
    ],
    'netIncome': [
      'net income',
      'net profit',
      'net earnings',
      'profit after tax',
      'net income after tax',
      'income after tax',
      'net profit after tax'
    ],
    'ebitda': [
      'ebitda',
      'adjusted ebitda',
      'adj. ebitda',
      'earnings before interest tax depreciation amortization',
      'operating income before depreciation'
    ],
    'totalAssets': [
      'total assets',
      'assets',
      'total asset',
      'consolidated assets'
    ],
    'cashEquivalents': [
      'cash and cash equivalents',
      'cash equivalents',
      'cash reserves',
      'cash and short-term investments',
      'cash and marketable securities'
    ],
    'debt': [
      'total debt',
      'long-term debt',
      'short-term debt',
      'debt obligations',
      'borrowings',
      'total borrowings'
    ],
    'profitMargin': [
      'profit margin',
      'net profit margin',
      'net margin',
      'operating margin'
    ]
  };

  normalizeCompanyName(name: string): string {
    return name
      .replace(/\b(inc|incorporated|corp|corporation|ltd|limited|llc|co|company)\b\.?/gi, '')
      .replace(/[^\w\s]/g, '')
      .trim()
      .toLowerCase();
  }

  /**
   * Validates if user-entered company name matches AI-extracted company name
   * Returns validation result with confidence score and normalized names
   */
  validateCompanyNameMatch(
    userEnteredName: string, 
    aiExtractedName: string
  ): {
    isMatch: boolean;
    confidence: number;
    userNormalized: string;
    aiNormalized: string;
    issues: string[];
  } {
    const userNormalized = this.normalizeCompanyName(userEnteredName);
    const aiNormalized = this.normalizeCompanyName(aiExtractedName);
    const issues: string[] = [];

    // Exact match after normalization
    if (userNormalized === aiNormalized) {
      return {
        isMatch: true,
        confidence: 1.0,
        userNormalized,
        aiNormalized,
        issues: []
      };
    }

    // Check if one contains the other (partial match)
    const userWords = userNormalized.split(/\s+/).filter(w => w.length > 2);
    const aiWords = aiNormalized.split(/\s+/).filter(w => w.length > 2);
    
    // Calculate word overlap with improved logic
    const commonWords = userWords.filter(word => aiWords.includes(word));
    const totalUniqueWords = new Set([...userWords, ...aiWords]).size;
    
    // Avoid division by zero and NaN issues
    const minWords = Math.min(userWords.length, aiWords.length);
    const overlapRatio = minWords > 0 ? commonWords.length / minWords : 0;
    
    // Ensure ratio is not NaN
    const safeOverlapRatio = isNaN(overlapRatio) ? 0 : overlapRatio;
    
    // High confidence if significant word overlap (minimum 0.8 threshold)
    if (safeOverlapRatio >= 0.9) {
      return {
        isMatch: true,
        confidence: safeOverlapRatio,
        userNormalized,
        aiNormalized,
        issues: [`Minor name variation detected. User: "${userEnteredName}", Document: "${aiExtractedName}"`]
      };
    }
    
    // Medium-high confidence for good matches (raised minimum threshold to 0.8)
    if (safeOverlapRatio >= 0.8) {
      return {
        isMatch: true,
        confidence: safeOverlapRatio,
        userNormalized,
        aiNormalized,
        issues: [`Acceptable name match detected. User: "${userEnteredName}", Document: "${aiExtractedName}"`]
      };
    }
    
    // Handle special cases for short names and known abbreviations
    const hasShortNameMatch = this.checkShortNameMatch(userWords, aiWords);
    if (hasShortNameMatch.isMatch) {
      return {
        isMatch: true,
        confidence: hasShortNameMatch.confidence,
        userNormalized,
        aiNormalized,
        issues: [`Short name match detected. User: "${userEnteredName}", Document: "${aiExtractedName}"`]
      };
    }
    
    // Check for common abbreviations and variations (lowered confidence to meet 0.8 threshold)
    const isAbbreviationMatch = this.checkAbbreviationMatch(userWords, aiWords);
    if (isAbbreviationMatch) {
      return {
        isMatch: false, // Below 0.8 threshold, so reject
        confidence: 0.7,
        userNormalized,
        aiNormalized,
        issues: [`Possible abbreviation match detected but below confidence threshold. User: "${userEnteredName}", Document: "${aiExtractedName}"`]
      };
    }
    
    // No match found - all confidence checks failed
    issues.push(`Company name mismatch: User entered "${userEnteredName}" but document contains "${aiExtractedName}"`);
    issues.push('Please verify you uploaded the correct document or check the company name spelling.');
    issues.push(`Confidence score: ${safeOverlapRatio.toFixed(2)} (minimum required: 0.8)`);
    
    return {
      isMatch: false,
      confidence: safeOverlapRatio,
      userNormalized,
      aiNormalized,
      issues
    };
  }

  /**
   * Check for special short name matches (e.g., "3M", "IBM", "GE")
   */
  private checkShortNameMatch(userWords: string[], aiWords: string[]): { isMatch: boolean; confidence: number } {
    // Handle very short company names that are well-known
    const knownShortNames = ['3m', 'ibm', 'ge', 'hp', 'att', 'bp', 'ups', 'amd', 'aig'];
    
    for (const userWord of userWords) {
      for (const aiWord of aiWords) {
        const userLower = userWord.toLowerCase();
        const aiLower = aiWord.toLowerCase();
        
        // Exact match for known short names
        if (knownShortNames.includes(userLower) && knownShortNames.includes(aiLower) && userLower === aiLower) {
          return { isMatch: true, confidence: 0.95 };
        }
        
        // Handle cases like "3M" vs "3M Company" or "IBM" vs "IBM Corporation"
        if ((userLower.length <= 3 || aiLower.length <= 3) && 
            (userLower === aiLower || aiLower.startsWith(userLower) || userLower.startsWith(aiLower))) {
          return { isMatch: true, confidence: 0.85 };
        }
      }
    }
    
    return { isMatch: false, confidence: 0 };
  }
  
  /**
   * Check if words might be abbreviations of each other
   */
  private checkAbbreviationMatch(userWords: string[], aiWords: string[]): boolean {
    // Check if user input might be abbreviation of AI extracted name
    for (const userWord of userWords) {
      for (const aiWord of aiWords) {
        // Check if userWord is abbreviation of aiWord (more strict)
        if (userWord.length >= 2 && aiWord.length > userWord.length * 2) {
          if (aiWord.toLowerCase().startsWith(userWord.toLowerCase())) {
            return true;
          }
        }
        // Check if aiWord is abbreviation of userWord (more strict)
        if (aiWord.length >= 2 && userWord.length > aiWord.length * 2) {
          if (userWord.toLowerCase().startsWith(aiWord.toLowerCase())) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  findStandardKPI(text: string): string | null {
    const lowercaseText = text.toLowerCase().trim();
    
    for (const [standardName, synonyms] of Object.entries(this.synonymMap)) {
      if (synonyms.some(synonym => lowercaseText.includes(synonym))) {
        return standardName;
      }
    }
    
    return null;
  }

  normalizeMetricValue(value: any): number | null {
    if (value === null || value === undefined) return null;
    
    // If it's already a number
    if (typeof value === 'number') return value;
    
    // If it's a string, try to parse it
    if (typeof value === 'string') {
      // Remove currency symbols and commas
      const cleanValue = value.replace(/[$,\s]/g, '');
      
      // Handle billions/millions notation
      if (cleanValue.toLowerCase().includes('b') || cleanValue.toLowerCase().includes('billion')) {
        const num = parseFloat(cleanValue.replace(/[^\d.-]/g, ''));
        return isNaN(num) ? null : num;
      }
      
      if (cleanValue.toLowerCase().includes('m') || cleanValue.toLowerCase().includes('million')) {
        const num = parseFloat(cleanValue.replace(/[^\d.-]/g, ''));
        return isNaN(num) ? null : num / 1000; // Convert to billions
      }
      
      // Regular number parsing
      const num = parseFloat(cleanValue);
      return isNaN(num) ? null : num;
    }
    
    return null;
  }

  addSynonym(standardKPI: string, synonym: string): void {
    if (!this.synonymMap[standardKPI]) {
      this.synonymMap[standardKPI] = [];
    }
    this.synonymMap[standardKPI].push(synonym.toLowerCase());
  }

  getStandardKPIs(): string[] {
    return Object.keys(this.synonymMap);
  }
}

export const kpiNormalizer = new KPINormalizer();
