export interface MarketDataResult {
  sector?: string;
  currentPrice?: number;
  weekHigh52?: number;
  weekLow52?: number;
  marketCap?: number;
  dividendYield?: number;
  eps?: number;
  peRatio?: number;
  lastUpdated: Date;
}

export class MarketDataService {
  /**
   * Generate search query for comprehensive market data
   */
  generateSearchQuery(companyName: string): string {
    return `${companyName} stock price market cap P/E ratio dividend yield EPS 52 week high low sector industry 2025`;
  }

  /**
   * Parse market data from web search results
   */
  parseMarketData(searchResults: string, companyName: string): MarketDataResult | null {
    try {
      console.log(`Parsing market data for: ${companyName}`);
      
      if (!searchResults) {
        console.warn(`No search results for ${companyName}`);
        return null;
      }
      
      // Extract data from search results using pattern matching
      const marketData = this.parseMarketDataFromSearchResults(searchResults, companyName);
      
      console.log(`Market data extracted for ${companyName}:`, marketData);
      return marketData;
      
    } catch (error) {
      console.error(`Failed to parse market data for ${companyName}:`, error);
      return null;
    }
  }

  /**
   * Parse market data from web search results using pattern matching
   */
  private parseMarketDataFromSearchResults(searchResults: string, companyName: string): MarketDataResult {
    const results: MarketDataResult = {
      lastUpdated: new Date()
    };

    // Convert to lowercase for easier matching
    const text = searchResults.toLowerCase();
    
    // Extract sector/industry
    const sectorPatterns = [
      /sector[:\s]+([^,\n.]+)/i,
      /industry[:\s]+([^,\n.]+)/i,
      /(automotive|technology|healthcare|financial|energy|consumer|industrial|materials|utilities|telecommunications|real estate)/i
    ];
    
    for (const pattern of sectorPatterns) {
      const match = text.match(pattern);
      if (match) {
        results.sector = this.cleanAndCapitalize(match[1]);
        break;
      }
    }
    
    // Extract current price
    const pricePatterns = [
      /(?:current price|stock price|share price)[:\s]*\$?([\d,]+\.?\d*)/i,
      /trading at[:\s]*\$?([\d,]+\.?\d*)/i,
      /price[:\s]*\$?([\d,]+\.?\d*)/i
    ];
    
    for (const pattern of pricePatterns) {
      const match = text.match(pattern);
      if (match) {
        results.currentPrice = this.parseNumericValue(match[1]);
        break;
      }
    }
    
    // Extract 52-week high/low
    const weekHighMatch = text.match(/(?:52.?week high|52w high)[:\s]*\$?([\d,]+\.?\d*)/i);
    if (weekHighMatch) {
      results.weekHigh52 = this.parseNumericValue(weekHighMatch[1]);
    }
    
    const weekLowMatch = text.match(/(?:52.?week low|52w low)[:\s]*\$?([\d,]+\.?\d*)/i);
    if (weekLowMatch) {
      results.weekLow52 = this.parseNumericValue(weekLowMatch[1]);
    }
    
    // Extract market cap (convert to billions)
    const marketCapPatterns = [
      /market cap[:\s]*\$?([\d,]+\.?\d*)\s*(billion|b)/i,
      /market capitalization[:\s]*\$?([\d,]+\.?\d*)\s*(billion|b)/i,
      /market cap[:\s]*\$?([\d,]+\.?\d*)\s*(million|m)/i, // Convert millions to billions
      /market cap[:\s]*\$?([\d,]+\.?\d*)\s*(trillion|t)/i // Convert trillions to billions
    ];
    
    for (const pattern of marketCapPatterns) {
      const match = text.match(pattern);
      if (match) {
        const value = this.parseNumericValue(match[1]);
        const unit = match[2].toLowerCase();
        
        if (unit.startsWith('b')) {
          results.marketCap = value;
        } else if (unit.startsWith('m')) {
          results.marketCap = value / 1000; // Convert millions to billions
        } else if (unit.startsWith('t')) {
          results.marketCap = value * 1000; // Convert trillions to billions
        }
        break;
      }
    }
    
    // Extract dividend yield
    const dividendYieldMatch = text.match(/dividend yield[:\s]*([\d,]+\.?\d*)%?/i);
    if (dividendYieldMatch) {
      results.dividendYield = this.parseNumericValue(dividendYieldMatch[1]);
    }
    
    // Extract EPS
    const epsPatterns = [
      /eps[:\s]*\$?([\d,]+\.?\d*)/i,
      /earnings per share[:\s]*\$?([\d,]+\.?\d*)/i
    ];
    
    for (const pattern of epsPatterns) {
      const match = text.match(pattern);
      if (match) {
        results.eps = this.parseNumericValue(match[1]);
        break;
      }
    }
    
    // Extract P/E ratio
    const peRatioPatterns = [
      /p\/e ratio[:\s]*([\d,]+\.?\d*)/i,
      /pe ratio[:\s]*([\d,]+\.?\d*)/i,
      /price.?to.?earnings[:\s]*([\d,]+\.?\d*)/i
    ];
    
    for (const pattern of peRatioPatterns) {
      const match = text.match(pattern);
      if (match) {
        results.peRatio = this.parseNumericValue(match[1]);
        break;
      }
    }
    
    return results;
  }

  /**
   * Clean and capitalize sector/industry names
   */
  private cleanAndCapitalize(text: string): string {
    return text
      .trim()
      .replace(/[^\w\s&]/g, '') // Remove special chars except &
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Parse numeric values, removing commas and converting to number
   */
  private parseNumericValue(value: string): number {
    return parseFloat(value.replace(/,/g, ''));
  }

  /**
   * Parse market data for multiple companies from their respective search results
   */
  parseMarketDataForCompanies(
    searchResultsMap: Record<string, string>
  ): Record<string, MarketDataResult | null> {
    const results: Record<string, MarketDataResult | null> = {};
    
    for (const [companyName, searchResults] of Object.entries(searchResultsMap)) {
      results[companyName] = this.parseMarketData(searchResults, companyName);
    }
    
    return results;
  }
}

export const marketDataService = new MarketDataService();