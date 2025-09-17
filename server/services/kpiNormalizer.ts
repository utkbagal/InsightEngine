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
