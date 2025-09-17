/**
 * Financial Ratio Calculator Service
 * Calculates key financial ratios from extracted metrics
 */

export interface RatioInputs {
  // Core metrics
  revenue?: number | null;
  netIncome?: number | null;
  grossProfit?: number | null;
  operatingIncome?: number | null;
  ebitda?: number | null;
  
  // Balance sheet
  totalAssets?: number | null;
  currentAssets?: number | null;
  currentLiabilities?: number | null;
  totalDebt?: number | null;
  longTermDebt?: number | null;
  shortTermDebt?: number | null;
  cashEquivalents?: number | null;
  shareholdersEquity?: number | null;
  
  // Share info
  sharesOutstanding?: number | null;
  
  // Market data (from web enrichment)
  stockPrice?: number | null;
  marketCap?: number | null;
}

export interface CalculatedRatios {
  // Profitability Ratios (%)
  grossMargin?: number | null;
  operatingMargin?: number | null;
  profitMargin?: number | null;
  roe?: number | null; // Return on Equity
  roa?: number | null; // Return on Assets
  roic?: number | null; // Return on Invested Capital
  
  // Liquidity Ratios
  currentRatio?: number | null;
  quickRatio?: number | null;
  cashRatio?: number | null;
  
  // Leverage Ratios
  debtToEquity?: number | null;
  debtToAssets?: number | null;
  
  // Per Share Metrics
  eps?: number | null; // Earnings Per Share
  bookValuePerShare?: number | null;
  
  // Valuation Ratios (requires market data)
  peRatio?: number | null;
  pbRatio?: number | null;
  
  // Calculated fields
  interestCoverage?: number | null;
}

export class RatioCalculator {
  /**
   * Calculate all possible ratios from available inputs
   */
  static calculateAllRatios(inputs: RatioInputs): CalculatedRatios {
    const ratios: CalculatedRatios = {};

    // Profitability Ratios
    ratios.grossMargin = this.calculateGrossMargin(inputs.grossProfit, inputs.revenue);
    ratios.operatingMargin = this.calculateOperatingMargin(inputs.operatingIncome, inputs.revenue);
    ratios.profitMargin = this.calculateProfitMargin(inputs.netIncome, inputs.revenue);
    ratios.roe = this.calculateROE(inputs.netIncome, inputs.shareholdersEquity);
    ratios.roa = this.calculateROA(inputs.netIncome, inputs.totalAssets);
    ratios.roic = this.calculateROIC(inputs.netIncome, inputs.totalDebt, inputs.shareholdersEquity);

    // Liquidity Ratios
    ratios.currentRatio = this.calculateCurrentRatio(inputs.currentAssets, inputs.currentLiabilities);
    ratios.quickRatio = this.calculateQuickRatio(inputs.currentAssets, inputs.currentLiabilities);
    ratios.cashRatio = this.calculateCashRatio(inputs.cashEquivalents, inputs.currentLiabilities);

    // Leverage Ratios
    ratios.debtToEquity = this.calculateDebtToEquity(inputs.totalDebt, inputs.shareholdersEquity);
    ratios.debtToAssets = this.calculateDebtToAssets(inputs.totalDebt, inputs.totalAssets);

    // Per Share Metrics
    ratios.eps = this.calculateEPS(inputs.netIncome, inputs.sharesOutstanding);
    ratios.bookValuePerShare = this.calculateBookValuePerShare(inputs.shareholdersEquity, inputs.sharesOutstanding);

    // Valuation Ratios (require market data)
    ratios.peRatio = this.calculatePERatio(inputs.stockPrice, ratios.eps);
    ratios.pbRatio = this.calculatePBRatio(inputs.stockPrice, ratios.bookValuePerShare);

    return ratios;
  }

  // Profitability Ratio Calculations
  private static calculateGrossMargin(grossProfit?: number | null, revenue?: number | null): number | null {
    if (!grossProfit || !revenue || revenue === 0) return null;
    return Math.round((grossProfit / revenue) * 100 * 100) / 100; // Round to 2 decimal places
  }

  private static calculateOperatingMargin(operatingIncome?: number | null, revenue?: number | null): number | null {
    if (!operatingIncome || !revenue || revenue === 0) return null;
    return Math.round((operatingIncome / revenue) * 100 * 100) / 100;
  }

  private static calculateProfitMargin(netIncome?: number | null, revenue?: number | null): number | null {
    if (!netIncome || !revenue || revenue === 0) return null;
    return Math.round((netIncome / revenue) * 100 * 100) / 100;
  }

  private static calculateROE(netIncome?: number | null, shareholdersEquity?: number | null): number | null {
    if (!netIncome || !shareholdersEquity || shareholdersEquity === 0) return null;
    return Math.round((netIncome / shareholdersEquity) * 100 * 100) / 100;
  }

  private static calculateROA(netIncome?: number | null, totalAssets?: number | null): number | null {
    if (!netIncome || !totalAssets || totalAssets === 0) return null;
    return Math.round((netIncome / totalAssets) * 100 * 100) / 100;
  }

  private static calculateROIC(
    netIncome?: number | null, 
    totalDebt?: number | null, 
    shareholdersEquity?: number | null
  ): number | null {
    if (!netIncome || !totalDebt || !shareholdersEquity) return null;
    const investedCapital = totalDebt + shareholdersEquity;
    if (investedCapital === 0) return null;
    return Math.round((netIncome / investedCapital) * 100 * 100) / 100;
  }

  // Liquidity Ratio Calculations
  private static calculateCurrentRatio(currentAssets?: number | null, currentLiabilities?: number | null): number | null {
    if (!currentAssets || !currentLiabilities || currentLiabilities === 0) return null;
    return Math.round((currentAssets / currentLiabilities) * 100) / 100;
  }

  private static calculateQuickRatio(currentAssets?: number | null, currentLiabilities?: number | null): number | null {
    // Assuming 70% of current assets are liquid (conservative estimate without inventory data)
    if (!currentAssets || !currentLiabilities || currentLiabilities === 0) return null;
    const quickAssets = currentAssets * 0.7; // Conservative estimate
    return Math.round((quickAssets / currentLiabilities) * 100) / 100;
  }

  private static calculateCashRatio(cashEquivalents?: number | null, currentLiabilities?: number | null): number | null {
    if (!cashEquivalents || !currentLiabilities || currentLiabilities === 0) return null;
    return Math.round((cashEquivalents / currentLiabilities) * 100) / 100;
  }

  // Leverage Ratio Calculations
  private static calculateDebtToEquity(totalDebt?: number | null, shareholdersEquity?: number | null): number | null {
    if (!totalDebt || !shareholdersEquity || shareholdersEquity === 0) return null;
    return Math.round((totalDebt / shareholdersEquity) * 100) / 100;
  }

  private static calculateDebtToAssets(totalDebt?: number | null, totalAssets?: number | null): number | null {
    if (!totalDebt || !totalAssets || totalAssets === 0) return null;
    return Math.round((totalDebt / totalAssets) * 100 * 100) / 100;
  }

  // Per Share Calculations
  private static calculateEPS(netIncome?: number | null, sharesOutstanding?: number | null): number | null {
    if (!netIncome || !sharesOutstanding || sharesOutstanding === 0) return null;
    // netIncome is in billions USD, sharesOutstanding is in millions
    // EPS = (netIncome * 1000 million) / sharesOutstanding million = dollars per share
    return Math.round((netIncome * 1000 / sharesOutstanding) * 100) / 100;
  }

  private static calculateBookValuePerShare(
    shareholdersEquity?: number | null, 
    sharesOutstanding?: number | null
  ): number | null {
    if (!shareholdersEquity || !sharesOutstanding || sharesOutstanding === 0) return null;
    // shareholdersEquity is in billions USD, sharesOutstanding is in millions
    // BookValue = (equity * 1000 million) / sharesOutstanding million = dollars per share
    return Math.round((shareholdersEquity * 1000 / sharesOutstanding) * 100) / 100;
  }

  // Valuation Ratio Calculations (require market data)
  private static calculatePERatio(stockPrice?: number | null, eps?: number | null): number | null {
    if (!stockPrice || !eps || eps === 0) return null;
    return Math.round((stockPrice / eps) * 100) / 100;
  }

  private static calculatePBRatio(stockPrice?: number | null, bookValuePerShare?: number | null): number | null {
    if (!stockPrice || !bookValuePerShare || bookValuePerShare === 0) return null;
    return Math.round((stockPrice / bookValuePerShare) * 100) / 100;
  }

  /**
   * Validate that calculated ratios are within reasonable bounds
   */
  static validateRatios(ratios: CalculatedRatios): CalculatedRatios {
    const validated = { ...ratios };

    // Set reasonable bounds for ratios
    const bounds = {
      grossMargin: { min: -100, max: 100 },
      operatingMargin: { min: -100, max: 100 },
      profitMargin: { min: -100, max: 100 },
      roe: { min: -100, max: 200 },
      roa: { min: -100, max: 100 },
      roic: { min: -100, max: 100 },
      currentRatio: { min: 0, max: 50 },
      quickRatio: { min: 0, max: 50 },
      cashRatio: { min: 0, max: 50 },
      debtToEquity: { min: 0, max: 50 },
      debtToAssets: { min: 0, max: 100 },
      eps: { min: -1000, max: 1000 },
      bookValuePerShare: { min: -1000, max: 10000 },
      peRatio: { min: -1000, max: 1000 },
      pbRatio: { min: -100, max: 100 }
    };

    // Apply bounds validation
    for (const [ratio, value] of Object.entries(validated)) {
      if (value !== null && value !== undefined) {
        const bound = bounds[ratio as keyof typeof bounds];
        if (bound && (value < bound.min || value > bound.max)) {
          console.warn(`Ratio ${ratio} value ${value} outside reasonable bounds [${bound.min}, ${bound.max}], setting to null`);
          (validated as any)[ratio] = null;
        }
      }
    }

    return validated;
  }

  /**
   * Calculate confidence score for ratio calculations based on input completeness
   */
  static calculateConfidenceScore(inputs: RatioInputs, ratios: CalculatedRatios): number {
    const totalPossibleRatios = Object.keys(ratios).length;
    const calculatedRatios = Object.values(ratios).filter(v => v !== null && v !== undefined).length;
    
    const completenessScore = calculatedRatios / totalPossibleRatios;
    
    // Boost confidence if we have key fundamentals
    let keyMetricsBonus = 0;
    if (inputs.revenue && inputs.netIncome) keyMetricsBonus += 0.2;
    if (inputs.totalAssets && inputs.shareholdersEquity) keyMetricsBonus += 0.15;
    if (inputs.currentAssets && inputs.currentLiabilities) keyMetricsBonus += 0.1;
    
    return Math.min(1.0, completenessScore + keyMetricsBonus);
  }
}