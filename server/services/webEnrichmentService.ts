import type { FinancialMetrics } from "@shared/schema";

export interface EnrichedMetrics extends FinancialMetrics {
  enrichedFields?: {
    [key: string]: {
      value: number | string;
      source: string;
      disclaimer: string;
      timestamp: Date;
    };
  };
}

export class WebEnrichmentService {
  /**
   * Search for missing financial data on the web and enrich metrics
   */
  async enrichMissingMetrics(
    companyName: string,
    metrics: FinancialMetrics,
    year: number,
    quarter?: string
  ): Promise<EnrichedMetrics> {
    const enrichedMetrics = { ...metrics } as EnrichedMetrics;
    enrichedMetrics.enrichedFields = {};

    const missingFields = this.identifyMissingFields(metrics);
    
    if (missingFields.length === 0) {
      return enrichedMetrics; // No missing data to enrich
    }

    // Search for missing financial data for this company
    const period = quarter ? `${quarter} ${year}` : `${year}`;
    const searchQuery = `${companyName} financial results ${period} ${missingFields.join(' ')} revenue net income`;

    try {
      const webData = await this.searchFinancialData(searchQuery);
      
      // Process and extract relevant financial information
      const extractedData = await this.extractFinancialDataFromSearch(webData, companyName, missingFields);
      
      // Enrich missing fields with web data
      for (const field of missingFields) {
        if (extractedData[field] !== undefined && extractedData[field] !== null) {
          enrichedMetrics.enrichedFields![field] = {
            value: extractedData[field],
            source: 'Web Search',
            disclaimer: `*Data sourced from web search and may not reflect official filings. Please verify with company's official financial statements.`,
            timestamp: new Date()
          };
          
          // Also update the main field with the web-sourced value
          (enrichedMetrics as any)[field] = extractedData[field];
        }
      }
    } catch (error) {
      console.error(`Web enrichment failed for ${companyName}:`, error);
      // Don't throw - just return original metrics if web search fails
    }

    return enrichedMetrics;
  }

  /**
   * Identify which financial metrics are missing (null/undefined)
   */
  private identifyMissingFields(metrics: FinancialMetrics): string[] {
    const fields = [
      'revenue', 
      'netIncome', 
      'totalAssets', 
      'cashEquivalents', 
      'profitMargin', 
      'yoyGrowth', 
      'ebitda', 
      'debt'
    ];

    return fields.filter(field => {
      const value = (metrics as any)[field];
      return value === null || value === undefined || value === 0;
    });
  }

  /**
   * Search for financial data using web search
   */
  private async searchFinancialData(query: string): Promise<string> {
    try {
      // This would normally use the web_search tool, but since we can't call tools from services,
      // we'll implement this in the routes layer. For now, return a placeholder.
      throw new Error('Web search must be implemented in routes layer');
    } catch (error) {
      console.error('Web search error:', error);
      throw error;
    }
  }

  /**
   * Extract financial metrics from web search results using AI
   */
  private async extractFinancialDataFromSearch(
    searchResults: string,
    companyName: string,
    missingFields: string[]
  ): Promise<Record<string, number | null>> {
    // This would use AI to extract financial data from search results
    // For now, return empty object - will be implemented in the routes layer
    return {};
  }

  /**
   * Generate disclaimer text for web-sourced data
   */
  static generateDisclaimer(source: string): string {
    return `*This data was supplemented from ${source} and may not reflect official company filings. Please verify with the company's official financial statements and SEC filings.`;
  }
}

export const webEnrichmentService = new WebEnrichmentService();