import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

  const getInsightColor = (impact: ComparisonInsight['impact']) => {
    switch (impact) {
      case 'positive': return 'bg-accent/10 text-accent border-accent/20';
      case 'negative': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const formatCurrency = (value?: number | null) => {
    if (value === null || value === undefined) return 'N/A';
    return `$${value.toFixed(1)}B`;
  };

  const formatPercent = (value?: number | null) => {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(1)}%`;
  };

  const calculateDifference = (val1?: number | null, val2?: number | null) => {
    if (!val1 || !val2) return { text: 'N/A', isPositive: null };
    const diff = ((val1 - val2) / val2) * 100;
    return {
      text: `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`,
      isPositive: diff >= 0
    };
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

      {/* Company Overview Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {result.metrics.map((metric, index) => (
          <Card key={index} className="shadow-sm" data-testid={`card-company-overview-${index}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{metric.companyName}</CardTitle>
                <Badge variant="secondary">Analyzed</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Period</span>
                  <span className="text-sm font-medium">{metric.period}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Revenue</span>
                  <span className="text-sm font-medium">{formatCurrency(metric.revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Net Income</span>
                  <span className="text-sm font-medium text-accent">{formatCurrency(metric.netIncome)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Key Insights Panel */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 mb-8 shadow-sm" data-testid="card-insights-panel">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lightbulb className="mr-2 h-5 w-5 text-accent" />
            Key Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {result.insights.insights.map((insight, index) => {
              const IconComponent = getInsightIcon(insight.type);
              return (
                <Card key={index} className={`border ${getInsightColor(insight.impact)}`} data-testid={`card-insight-${index}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        insight.impact === 'positive' ? 'bg-accent/10' :
                        insight.impact === 'negative' ? 'bg-destructive/10' : 'bg-muted'
                      }`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">{insight.title}</p>
                        <p className="text-xs text-current/80">{insight.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

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
                  <th key={index} className="text-right p-4 font-medium text-foreground">
                    {metric.companyName}
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
                  <td key={index} className="p-4 text-right font-mono">
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
                  <td key={index} className="p-4 text-right font-mono">
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
                <td className="p-4 font-medium text-foreground">Profit Margin (%)</td>
                {result.metrics.map((metric, index) => (
                  <td key={index} className="p-4 text-right font-mono">
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
                  <td key={index} className="p-4 text-right font-mono">
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
                  <td key={index} className="p-4 text-right font-mono">
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

      {/* Chart Visualization */}
      <Card className="shadow-sm mb-8" data-testid="card-visual-comparison">
        <CardHeader>
          <CardTitle>Visual Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Revenue Comparison */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Revenue Comparison (USD Billions)
              </h4>
              <div className="space-y-3">
                {result.metrics.map((metric, index) => {
                  const maxRevenue = Math.max(...result.metrics.map(m => m.revenue || 0));
                  const percentage = maxRevenue > 0 ? ((metric.revenue || 0) / maxRevenue) * 100 : 0;
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-foreground w-20 truncate">{metric.companyName}</span>
                      <div className="flex-1 ml-4 mr-4">
                        <Progress value={percentage} className="h-4" />
                      </div>
                      <span className="text-sm font-mono text-foreground w-16">
                        {formatCurrency(metric.revenue)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Profit Margin Comparison */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Profit Margin Comparison (%)
              </h4>
              <div className="space-y-3">
                {result.metrics.map((metric, index) => {
                  const maxMargin = Math.max(...result.metrics.map(m => m.profitMargin || 0));
                  const percentage = maxMargin > 0 ? ((metric.profitMargin || 0) / maxMargin) * 100 : 0;
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-foreground w-20 truncate">{metric.companyName}</span>
                      <div className="flex-1 ml-4 mr-4">
                        <Progress value={percentage} className="h-4" />
                      </div>
                      <span className="text-sm font-mono text-foreground w-16">
                        {formatPercent(metric.profitMargin)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
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
