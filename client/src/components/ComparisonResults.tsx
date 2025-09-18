import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import EnhancedVisualComparison from "@/components/EnhancedVisualComparison";
import PriceScale from "@/components/PriceScale";
import { 
  Download, 
  Share, 
  Plus, 
  TrendingUp, 
  Percent, 
  BarChart3, 
  AlertTriangle,
  Lightbulb
} from "lucide-react";
import { api, type ComparisonResult, type ComparisonInsight } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// Company color arrays for consistent visual identification
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];
const LIGHT_COLORS = [
  'rgba(136, 132, 216, 0.15)', // Light purple-blue
  'rgba(130, 202, 157, 0.15)', // Light green  
  'rgba(255, 198, 88, 0.15)',  // Light orange
  'rgba(255, 124, 124, 0.15)', // Light red
  'rgba(141, 209, 225, 0.15)'  // Light cyan
];
const MEDIUM_COLORS = [
  'rgba(136, 132, 216, 0.25)', 
  'rgba(130, 202, 157, 0.25)', 
  'rgba(255, 198, 88, 0.25)',  
  'rgba(255, 124, 124, 0.25)', 
  'rgba(141, 209, 225, 0.25)'  
];

interface ComparisonResultsProps {
  result: ComparisonResult;
  onNewComparison: () => void;
}

export default function ComparisonResults({ result, onNewComparison }: ComparisonResultsProps) {
  const { toast } = useToast();

  const handleExportCSV = async () => {
    try {
      const csvData = await api.exportComparison(result.comparison.id);
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-comparison-${result.comparison.id}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: "Comparison data has been exported to CSV"
      });
    } catch (error) {
      toast({
        title: "Export Error",
        description: "Failed to export comparison data",
        variant: "destructive"
      });
    }
  };

  const getInsightIcon = (type: ComparisonInsight['type']) => {
    switch (type) {
      case 'revenue': return TrendingUp;
      case 'profitability': return Percent;
      case 'growth': return BarChart3;
      case 'risk': return AlertTriangle;
      case 'efficiency': return BarChart3;
      default: return Lightbulb;
    }
  };

  const getBestPerformingCompany = (metricName: string) => {
    if (result.metrics.length < 2) return 0;
    
    const values = result.metrics.map(m => {
      switch (metricName.toLowerCase()) {
        case 'revenue': return m.revenue || 0;
        case 'net income': case 'netincome': return m.netIncome || 0;
        case 'profit margin': case 'profitmargin': return m.profitMargin || 0;
        case 'growth': case 'yoygrowth': return m.yoyGrowth || 0;
        case 'assets': case 'totalassets': return m.totalAssets || 0;
        case 'efficiency': return (m.profitMargin || 0) + (m.yoyGrowth || 0); // Combined efficiency score
        default: return 0;
      }
    });
    
    return values.indexOf(Math.max(...values));
  };

  const getInsightColor = (insight: ComparisonInsight) => {
    // Determine which company performs better for this insight type
    const bestCompanyIndex = getBestPerformingCompany(insight.type);
    const companyColor = COLORS[bestCompanyIndex % COLORS.length];
    const lightColor = LIGHT_COLORS[bestCompanyIndex % LIGHT_COLORS.length];
    
    // Use the best performing company's color scheme
    return {
      backgroundColor: lightColor,
      borderColor: companyColor,
      color: 'hsl(var(--foreground))'
    };
  };

  const formatCurrency = (value?: number | null) => {
    if (value === null || value === undefined) return 'N/A';
    return `$${value.toFixed(1)}B`;
  };

  const formatPercent = (value?: number | null) => {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(1)}%`;
  };

  const formatLargeNumber = (value?: number | null) => {
    if (value === null || value === undefined) return 'N/A';
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(1)}B`;
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatNumber = (value?: number | null) => {
    if (value === null || value === undefined) return 'N/A';
    return value.toFixed(2);
  };

  const formatPrice = (value?: number | null) => {
    if (value === null || value === undefined) return 'N/A';
    return `$${value.toFixed(2)}`;
  };

  const formatEPS = (value?: number | null) => {
    if (value === null || value === undefined) return 'N/A';
    return `$${value.toFixed(2)}`;
  };

  const calculateDifference = (val1?: number | null, val2?: number | null) => {
    if (val1 == null || val2 == null) return { text: 'N/A', isPositive: null };
    if (val2 === 0) return { text: 'N/A', isPositive: null }; // Avoid division by zero
    const diff = ((val1 - val2) / val2) * 100;
    return {
      text: `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`,
      isPositive: diff >= 0
    };
  };

  const renderDirectComparison = () => {
    if (result.metrics.length !== 2) return null;
    
    const [company1, company2] = result.metrics;
    
    // Fundamental metrics (from documents)
    const fundamentalMetrics = [
      { key: 'revenue', label: 'Revenue', format: formatCurrency },
      { key: 'netIncome', label: 'Net Income', format: formatCurrency },
      { key: 'ebitda', label: 'EBITDA', format: formatCurrency },
      { key: 'pat', label: 'PAT (Profit After Tax)', format: formatCurrency },
      { key: 'salesVolume', label: 'Sales Volume (Million Units)', format: formatNumber },
      { key: 'profitMargin', label: 'Profit Margin', format: formatPercent },
      { key: 'yoyGrowth', label: 'YoY Growth', format: formatPercent }
    ];

    // Market data metrics (from live market data)
    const marketMetrics = [
      { key: 'currentPrice', label: 'Current Price', format: formatPrice, compareLogic: 'neutral' },
      { key: 'marketCap', label: 'Market Cap', format: formatLargeNumber, compareLogic: 'neutral' },
      { key: 'dividendYield', label: 'Dividend Yield', format: formatPercent, compareLogic: 'higher' },
      { key: 'eps', label: 'EPS', format: formatEPS, compareLogic: 'higher' },
      { key: 'peRatio', label: 'P/E Ratio', format: formatNumber, compareLogic: 'lower' }
    ];
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-xl">Direct Comparison</CardTitle>
            <p className="text-center text-muted-foreground">Side-by-side key metrics</p>
          </CardHeader>
          <CardContent className="p-6">
            {/* 52-Week Price Scale for both companies */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-center">{company1.companyName}</h4>
                <PriceScale 
                  currentPrice={company1.currentPrice}
                  weekHigh52={company1.weekHigh52}
                  weekLow52={company1.weekLow52}
                  companyColor={COLORS[0]}
                />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-center">{company2.companyName}</h4>
                <PriceScale 
                  currentPrice={company2.currentPrice}
                  weekHigh52={company2.weekHigh52}
                  weekLow52={company2.weekLow52}
                  companyColor={COLORS[1]}
                />
              </div>
            </div>

            {/* Fundamental Metrics */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Fundamental Metrics
                </h3>
                <div className="space-y-4">
                  {fundamentalMetrics.map((metric, index) => {
                const value1 = company1[metric.key as keyof typeof company1] as number;
                const value2 = company2[metric.key as keyof typeof company2] as number;
                const isBetter1 = (value1 || 0) > (value2 || 0);
                const isBetter2 = (value2 || 0) > (value1 || 0);
                
                return (
                  <motion.div
                    key={metric.key}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="flex items-center justify-between py-3 border-b border-muted last:border-b-0"
                  >
                    {/* Metric Name on Left */}
                    <div className="w-1/3">
                      <h4 className="text-sm font-medium text-muted-foreground">{metric.label}</h4>
                    </div>
                    
                    {/* Company Values on Right - Horizontally */}
                    <div className="flex space-x-4 w-2/3 justify-end">
                      <div 
                        className="flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-all min-w-[140px]"
                        style={{
                          borderColor: isBetter1 ? COLORS[0] : 'hsl(var(--border))',
                          backgroundColor: isBetter1 ? LIGHT_COLORS[0] : 'hsl(var(--muted))'
                        }}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[0] }} />
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">{company1.companyName}</div>
                          <div className="text-sm font-semibold">{metric.format(value1)}</div>
                        </div>
                      </div>
                      
                      <div 
                        className="flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-all min-w-[140px]"
                        style={{
                          borderColor: isBetter2 ? COLORS[1] : 'hsl(var(--border))',
                          backgroundColor: isBetter2 ? LIGHT_COLORS[1] : 'hsl(var(--muted))'
                        }}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[1] }} />
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">{company2.companyName}</div>
                          <div className="text-sm font-semibold">{metric.format(value2)}</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
                  })}
                </div>
              </div>

              {/* Market Metrics */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Market Metrics
                </h3>
                <div className="space-y-4">
                  {marketMetrics.map((metric, index) => {
                    const value1 = company1[metric.key as keyof typeof company1] as number;
                    const value2 = company2[metric.key as keyof typeof company2] as number;
                    
                    // Only compare when both values are valid numbers
                    let isBetter1 = false;
                    let isBetter2 = false;
                    
                    if (value1 != null && value2 != null && metric.compareLogic !== 'neutral') {
                      if (metric.compareLogic === 'higher') {
                        isBetter1 = value1 > value2;
                        isBetter2 = value2 > value1;
                      } else if (metric.compareLogic === 'lower') {
                        isBetter1 = value1 < value2;
                        isBetter2 = value2 < value1;
                      }
                    }
                    
                    return (
                      <motion.div
                        key={metric.key}
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: (fundamentalMetrics.length + index) * 0.1 }}
                        className="flex items-center justify-between py-3 border-b border-muted last:border-b-0"
                      >
                        {/* Metric Name on Left */}
                        <div className="w-1/3">
                          <h4 className="text-sm font-medium text-muted-foreground">{metric.label}</h4>
                        </div>
                        
                        {/* Company Values on Right - Horizontally */}
                        <div className="flex space-x-4 w-2/3 justify-end">
                          <div 
                            className="flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-all min-w-[140px]"
                            style={{
                              borderColor: isBetter1 ? COLORS[0] : 'hsl(var(--border))',
                              backgroundColor: isBetter1 ? LIGHT_COLORS[0] : 'hsl(var(--muted))'
                            }}
                          >
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[0] }} />
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">{company1.companyName}</div>
                              <div className="text-sm font-semibold">{metric.format(value1)}</div>
                            </div>
                          </div>
                          
                          <div 
                            className="flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-all min-w-[140px]"
                            style={{
                              borderColor: isBetter2 ? COLORS[1] : 'hsl(var(--border))',
                              backgroundColor: isBetter2 ? LIGHT_COLORS[1] : 'hsl(var(--muted))'
                            }}
                          >
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[1] }} />
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">{company2.companyName}</div>
                              <div className="text-sm font-semibold">{metric.format(value2)}</div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="fade-in">
      {/* Results Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-4">Financial Comparison Results</h2>
        <p className="text-muted-foreground mb-4">Comprehensive analysis of uploaded financial documents</p>
        <div className="flex justify-center space-x-4">
          <Button onClick={handleExportCSV} variant="default" data-testid="button-export-csv">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" data-testid="button-share-report">
            <Share className="mr-2 h-4 w-4" />
            Share Report
          </Button>
        </div>
      </div>

      {/* Company Overview Cards with Animations - moved to top */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {result.metrics.map((metric, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ scale: 1.02, y: -5 }}
          >
            <Card 
              className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-l-4" 
              style={{ borderLeftColor: COLORS[index % COLORS.length] }}
              data-testid={`card-company-overview-${index}`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    {metric.companyName}
                  </CardTitle>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 + 0.2 }}
                  >
                    <Badge 
                      variant="secondary" 
                      style={{ backgroundColor: LIGHT_COLORS[index % LIGHT_COLORS.length], color: 'hsl(var(--foreground))' }}
                    >
                      Analyzed
                    </Badge>
                  </motion.div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metric.sector && (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 + 0.25 }}
                      className="flex justify-between"
                    >
                      <span className="text-sm text-muted-foreground">Sector</span>
                      <Badge 
                        variant="outline"
                        className="text-xs"
                        style={{ 
                          borderColor: COLORS[index % COLORS.length],
                          color: COLORS[index % COLORS.length]
                        }}
                      >
                        {metric.sector}
                      </Badge>
                    </motion.div>
                  )}
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 + 0.3 }}
                    className="flex justify-between"
                  >
                    <span className="text-sm text-muted-foreground">Period</span>
                    <span className="text-sm font-medium">{metric.period}</span>
                  </motion.div>
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 + 0.4 }}
                    className="flex justify-between"
                  >
                    <span className="text-sm text-muted-foreground">Revenue</span>
                    <span className="text-sm font-medium">{formatCurrency(metric.revenue)}</span>
                  </motion.div>
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 + 0.5 }}
                    className="flex justify-between"
                  >
                    <span className="text-sm text-muted-foreground">Net Income</span>
                    <span className="text-sm font-medium text-accent">{formatCurrency(metric.netIncome)}</span>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Key Visual Comparisons */}
      {renderDirectComparison()}
      
      {/* Enhanced Visual Comparison */}
      <EnhancedVisualComparison metrics={result.metrics} />

      {/* Key Insights Panel with Animations */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="bg-gradient-to-r from-primary/5 to-accent/5 mb-8 shadow-lg" data-testid="card-insights-panel">
          <CardHeader>
            <CardTitle className="flex items-center">
              <motion.div
                initial={{ rotate: -180, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Lightbulb className="mr-2 h-5 w-5 text-accent" />
              </motion.div>
              <motion.span
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                Key Insights
              </motion.span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {result.insights.insights.map((insight, index) => {
                const IconComponent = getInsightIcon(insight.type);
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.1 + 0.4 }}
                    whileHover={{ scale: 1.05, y: -2 }}
                  >
                    <Card 
                      className="border-2 transition-all duration-300" 
                      style={{
                        backgroundColor: getInsightColor(insight).backgroundColor,
                        borderColor: getInsightColor(insight).borderColor,
                        color: getInsightColor(insight).color
                      }}
                      data-testid={`card-insight-${index}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <motion.div 
                            initial={{ scale: 0, rotate: -90 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 + 0.5 }}
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: getInsightColor(insight).borderColor + '20' }}
                          >
                            <IconComponent className="h-4 w-4" style={{ color: getInsightColor(insight).borderColor }} />
                          </motion.div>
                          <div>
                            <motion.p 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.3, delay: index * 0.1 + 0.6 }}
                              className="text-sm font-medium mb-1"
                            >
                              {insight.title}
                            </motion.p>
                            <motion.p 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.3, delay: index * 0.1 + 0.7 }}
                              className="text-xs opacity-80"
                            >
                              {insight.description}
                            </motion.p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Comparison Table */}
      <Card className="shadow-sm overflow-hidden mb-8" data-testid="card-comparison-table">
        <CardHeader className="border-b border-border">
          <CardTitle>Financial Metrics Comparison</CardTitle>
          <p className="text-sm text-muted-foreground">Side-by-side comparison of key financial indicators</p>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium text-foreground">Metric</th>
                {result.metrics.map((metric, index) => (
                  <th 
                    key={index} 
                    className="text-right p-4 font-medium text-foreground"
                    style={{ backgroundColor: LIGHT_COLORS[index % LIGHT_COLORS.length] }}
                  >
                    <div className="flex items-center justify-end">
                      <div 
                        className="w-2 h-2 rounded-full mr-2" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      {metric.companyName}
                    </div>
                  </th>
                ))}
                {result.metrics.length === 2 && (
                  <th className="text-center p-4 font-medium text-foreground">Difference</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-muted/30">
                <td className="p-4 font-medium text-foreground">Revenue (USD Billions)</td>
                {result.metrics.map((metric, index) => (
                  <td 
                    key={index} 
                    className="p-4 text-right font-mono"
                    style={{ backgroundColor: LIGHT_COLORS[index % LIGHT_COLORS.length] }}
                    data-testid={`cell-revenue-${index}`}
                  >
                    {formatCurrency(metric.revenue)}
                  </td>
                ))}
                {result.metrics.length === 2 && (
                  <td className="p-4 text-center">
                    {(() => {
                      const diff = calculateDifference(result.metrics[0].revenue, result.metrics[1].revenue);
                      return (
                        <Badge variant={diff.isPositive ? "default" : "destructive"}>
                          {diff.text}
                        </Badge>
                      );
                    })()}
                  </td>
                )}
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="p-4 font-medium text-foreground">Net Income (USD Billions)</td>
                {result.metrics.map((metric, index) => (
                  <td 
                    key={index} 
                    className="p-4 text-right font-mono"
                    style={{ backgroundColor: LIGHT_COLORS[index % LIGHT_COLORS.length] }}
                    data-testid={`cell-netincome-${index}`}
                  >
                    {formatCurrency(metric.netIncome)}
                  </td>
                ))}
                {result.metrics.length === 2 && (
                  <td className="p-4 text-center">
                    {(() => {
                      const diff = calculateDifference(result.metrics[0].netIncome, result.metrics[1].netIncome);
                      return (
                        <Badge variant={diff.isPositive ? "default" : "destructive"}>
                          {diff.text}
                        </Badge>
                      );
                    })()}
                  </td>
                )}
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="p-4 font-medium text-foreground">EBITDA (USD Billions)</td>
                {result.metrics.map((metric, index) => (
                  <td 
                    key={index} 
                    className="p-4 text-right font-mono"
                    style={{ backgroundColor: LIGHT_COLORS[index % LIGHT_COLORS.length] }}
                    data-testid={`cell-ebitda-${index}`}
                  >
                    {formatCurrency(metric.ebitda)}
                  </td>
                ))}
                {result.metrics.length === 2 && (
                  <td className="p-4 text-center">
                    {(() => {
                      const diff = calculateDifference(result.metrics[0].ebitda, result.metrics[1].ebitda);
                      return (
                        <Badge variant={diff.isPositive ? "default" : "destructive"}>
                          {diff.text}
                        </Badge>
                      );
                    })()}
                  </td>
                )}
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="p-4 font-medium text-foreground">PAT (USD Billions)</td>
                {result.metrics.map((metric, index) => (
                  <td 
                    key={index} 
                    className="p-4 text-right font-mono"
                    style={{ backgroundColor: LIGHT_COLORS[index % LIGHT_COLORS.length] }}
                    data-testid={`cell-pat-${index}`}
                  >
                    {formatCurrency(metric.pat)}
                  </td>
                ))}
                {result.metrics.length === 2 && (
                  <td className="p-4 text-center">
                    {(() => {
                      const diff = calculateDifference(result.metrics[0].pat, result.metrics[1].pat);
                      return (
                        <Badge variant={diff.isPositive ? "default" : "destructive"}>
                          {diff.text}
                        </Badge>
                      );
                    })()}
                  </td>
                )}
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="p-4 font-medium text-foreground">Sales Volume (Million Units)</td>
                {result.metrics.map((metric, index) => (
                  <td 
                    key={index} 
                    className="p-4 text-right font-mono"
                    style={{ backgroundColor: LIGHT_COLORS[index % LIGHT_COLORS.length] }}
                    data-testid={`cell-salesvolume-${index}`}
                  >
                    {formatNumber(metric.salesVolume)}
                  </td>
                ))}
                {result.metrics.length === 2 && (
                  <td className="p-4 text-center">
                    {(() => {
                      const diff = calculateDifference(result.metrics[0].salesVolume, result.metrics[1].salesVolume);
                      return (
                        <Badge variant={diff.isPositive ? "default" : "destructive"}>
                          {diff.text}
                        </Badge>
                      );
                    })()}
                  </td>
                )}
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="p-4 font-medium text-foreground">Profit Margin (%)</td>
                {result.metrics.map((metric, index) => (
                  <td 
                    key={index} 
                    className="p-4 text-right font-mono"
                    style={{ backgroundColor: LIGHT_COLORS[index % LIGHT_COLORS.length] }}
                    data-testid={`cell-profitmargin-${index}`}
                  >
                    {formatPercent(metric.profitMargin)}
                  </td>
                ))}
                {result.metrics.length === 2 && (
                  <td className="p-4 text-center">
                    {(() => {
                      const diff = calculateDifference(result.metrics[0].profitMargin, result.metrics[1].profitMargin);
                      return (
                        <Badge variant={diff.isPositive ? "default" : "destructive"}>
                          {diff.text}
                        </Badge>
                      );
                    })()}
                  </td>
                )}
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="p-4 font-medium text-foreground">Total Assets (USD Billions)</td>
                {result.metrics.map((metric, index) => (
                  <td 
                    key={index} 
                    className="p-4 text-right font-mono"
                    style={{ backgroundColor: LIGHT_COLORS[index % LIGHT_COLORS.length] }}
                    data-testid={`cell-totalassets-${index}`}
                  >
                    {formatCurrency(metric.totalAssets)}
                  </td>
                ))}
                {result.metrics.length === 2 && (
                  <td className="p-4 text-center">
                    {(() => {
                      const diff = calculateDifference(result.metrics[0].totalAssets, result.metrics[1].totalAssets);
                      return (
                        <Badge variant={diff.isPositive ? "default" : "secondary"}>
                          {diff.text}
                        </Badge>
                      );
                    })()}
                  </td>
                )}
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="p-4 font-medium text-foreground">YoY Revenue Growth (%)</td>
                {result.metrics.map((metric, index) => (
                  <td 
                    key={index} 
                    className="p-4 text-right font-mono"
                    style={{ backgroundColor: LIGHT_COLORS[index % LIGHT_COLORS.length] }}
                    data-testid={`cell-yoygrowth-${index}`}
                  >
                    {formatPercent(metric.yoyGrowth)}
                  </td>
                ))}
                {result.metrics.length === 2 && (
                  <td className="p-4 text-center">
                    {(() => {
                      const diff = calculateDifference(result.metrics[0].yoyGrowth, result.metrics[1].yoyGrowth);
                      return (
                        <Badge variant={diff.isPositive ? "default" : "destructive"}>
                          {diff.text}
                        </Badge>
                      );
                    })()}
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="text-center">
        <div className="inline-flex space-x-4">
          <Button variant="outline" onClick={onNewComparison} data-testid="button-new-comparison">
            <Plus className="mr-2 h-4 w-4" />
            New Comparison
          </Button>
          <Button onClick={handleExportCSV} data-testid="button-download-report">
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
        </div>
      </div>
    </div>
  );
}
