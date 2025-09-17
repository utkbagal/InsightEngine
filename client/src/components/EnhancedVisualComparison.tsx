import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from 'recharts';
import { 
  BarChart3, 
  LineChart as LineChartIcon, 
  PieChart as PieChartIcon,
  RadarIcon,
  TrendingUp,
  Activity
} from 'lucide-react';

interface MetricData {
  companyName: string;
  period: string;
  revenue?: number | null;
  netIncome?: number | null;
  profitMargin?: number | null;
  totalAssets?: number | null;
  yoyGrowth?: number | null;
  ebitda?: number | null;
  debt?: number | null;
  enrichedFields?: any;
}

interface EnhancedVisualComparisonProps {
  metrics: MetricData[];
}

type ChartType = 'bar' | 'line' | 'pie' | 'radar' | 'metric-cards';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

export default function EnhancedVisualComparison({ metrics }: EnhancedVisualComparisonProps) {
  const [activeChart, setActiveChart] = useState<ChartType>('bar');

  // Format data for different chart types - preserve null values
  const formatDataForCharts = () => {
    return metrics.map((metric, index) => ({
      name: metric.companyName.length > 8 ? metric.companyName.substring(0, 8) + '...' : metric.companyName,
      fullName: metric.companyName,
      revenue: metric.revenue,
      netIncome: metric.netIncome,
      profitMargin: metric.profitMargin,
      totalAssets: metric.totalAssets,
      yoyGrowth: metric.yoyGrowth,
      ebitda: metric.ebitda,
      debt: metric.debt,
      color: COLORS[index % COLORS.length],
    }));
  };

  const formatDataForRadar = () => {
    const maxValues = {
      revenue: Math.max(...metrics.map(m => m.revenue || 0)),
      profitMargin: Math.max(...metrics.map(m => m.profitMargin || 0)),
      yoyGrowth: Math.max(...metrics.map(m => Math.abs(m.yoyGrowth || 0))),
      assets: Math.max(...metrics.map(m => m.totalAssets || 0)),
    };

    return [
      {
        metric: 'Revenue Scale',
        ...metrics.reduce((acc, metric, index) => {
          const normalizedValue = maxValues.revenue > 0 ? ((metric.revenue || 0) / maxValues.revenue) * 100 : 0;
          acc[metric.companyName] = normalizedValue;
          return acc;
        }, {} as any)
      },
      {
        metric: 'Profitability',
        ...metrics.reduce((acc, metric, index) => {
          const normalizedValue = maxValues.profitMargin > 0 ? ((metric.profitMargin || 0) / maxValues.profitMargin) * 100 : 0;
          acc[metric.companyName] = Math.max(0, normalizedValue);
          return acc;
        }, {} as any)
      },
      {
        metric: 'Growth Rate',
        ...metrics.reduce((acc, metric, index) => {
          const normalizedValue = maxValues.yoyGrowth > 0 ? (Math.abs(metric.yoyGrowth || 0) / maxValues.yoyGrowth) * 100 : 0;
          acc[metric.companyName] = normalizedValue;
          return acc;
        }, {} as any)
      },
      {
        metric: 'Asset Base',
        ...metrics.reduce((acc, metric, index) => {
          const normalizedValue = maxValues.assets > 0 ? ((metric.totalAssets || 0) / maxValues.assets) * 100 : 0;
          acc[metric.companyName] = normalizedValue;
          return acc;
        }, {} as any)
      },
    ];
  };

  const chartData = formatDataForCharts();
  const radarData = formatDataForRadar();

  const chartTypes: { type: ChartType; label: string; icon: any }[] = [
    { type: 'bar', label: 'Bar Chart', icon: BarChart3 },
    { type: 'line', label: 'Growth Trends', icon: LineChartIcon },
    { type: 'pie', label: 'Revenue Split', icon: PieChartIcon },
    { type: 'radar', label: 'Performance Radar', icon: RadarIcon },
    { type: 'metric-cards', label: 'Metric Cards', icon: Activity },
  ];

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return `$${value.toFixed(1)}B`;
  };
  
  const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(1)}%`;
  };

  const renderBarChart = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="h-80"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="name" className="text-xs" />
          <YAxis className="text-xs" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              fontSize: '12px'
            }}
            formatter={(value: number, name: string) => [
              name === 'revenue' ? formatCurrency(value) : 
              name === 'profitMargin' ? formatPercent(value) : value,
              name === 'revenue' ? 'Revenue' : 
              name === 'netIncome' ? 'Net Income' : 
              name === 'profitMargin' ? 'Profit Margin' : name
            ]}
          />
          <Legend />
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <Bar dataKey="revenue" fill="#8884d8" name="Revenue (Billions)" />
          </motion.g>
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <Bar dataKey="netIncome" fill="#82ca9d" name="Net Income (Billions)" />
          </motion.g>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );

  const renderLineChart = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-80"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="name" className="text-xs" />
          <YAxis className="text-xs" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              fontSize: '12px'
            }}
          />
          <Legend />
          <motion.g
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <Line 
              type="monotone" 
              dataKey="yoyGrowth" 
              stroke="#8884d8" 
              strokeWidth={3}
              name="YoY Growth (%)"
              dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
            />
          </motion.g>
          <motion.g
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <Line 
              type="monotone" 
              dataKey="profitMargin" 
              stroke="#82ca9d" 
              strokeWidth={3}
              name="Profit Margin (%)"
              dot={{ fill: '#82ca9d', strokeWidth: 2, r: 4 }}
            />
          </motion.g>
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );

  const renderPieChart = () => {
    const pieData = chartData.map((item, index) => ({
      name: item.fullName,
      value: item.revenue,
      color: item.color,
    }));

    return (
      <motion.div
        initial={{ opacity: 0, rotate: -10 }}
        animate={{ opacity: 1, rotate: 0 }}
        transition={{ duration: 0.6 }}
        className="h-80"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </motion.div>
    );
  };

  const renderRadarChart = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7 }}
      className="h-80"
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={radarData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="metric" className="text-xs" />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]}
            tickCount={5}
            className="text-xs"
          />
          {metrics.map((metric, index) => (
            <Radar
              key={metric.companyName}
              name={metric.companyName}
              dataKey={metric.companyName}
              stroke={COLORS[index % COLORS.length]}
              fill={COLORS[index % COLORS.length]}
              fillOpacity={0.1}
              strokeWidth={2}
            />
          ))}
          <Legend />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  );

  const renderMetricCards = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {chartData.map((company, index) => (
        <motion.div
          key={company.name}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          whileHover={{ scale: 1.02 }}
          className="p-1"
        >
          <Card className="h-full shadow-lg border-l-4" style={{ borderLeftColor: company.color }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: company.color }}
                />
                {company.fullName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.8, delay: index * 0.1 + 0.2 }}
                  className="flex justify-between items-center"
                >
                  <span className="text-sm text-muted-foreground">Revenue</span>
                  <Badge variant="secondary">{formatCurrency(company.revenue)}</Badge>
                </motion.div>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.8, delay: index * 0.1 + 0.4 }}
                  className="flex justify-between items-center"
                >
                  <span className="text-sm text-muted-foreground">Net Income</span>
                  <Badge variant="secondary">{formatCurrency(company.netIncome)}</Badge>
                </motion.div>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.8, delay: index * 0.1 + 0.6 }}
                  className="flex justify-between items-center"
                >
                  <span className="text-sm text-muted-foreground">Profit Margin</span>
                  <Badge 
                    variant={company.profitMargin > 10 ? "default" : "secondary"}
                  >
                    {formatPercent(company.profitMargin)}
                  </Badge>
                </motion.div>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.8, delay: index * 0.1 + 0.8 }}
                  className="flex justify-between items-center"
                >
                  <span className="text-sm text-muted-foreground">YoY Growth</span>
                  <Badge 
                    variant={company.yoyGrowth > 0 ? "default" : "destructive"}
                  >
                    {formatPercent(company.yoyGrowth)}
                  </Badge>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );

  const renderChart = () => {
    switch (activeChart) {
      case 'bar': return renderBarChart();
      case 'line': return renderLineChart();
      case 'pie': return renderPieChart();
      case 'radar': return renderRadarChart();
      case 'metric-cards': return renderMetricCards();
      default: return renderBarChart();
    }
  };

  return (
    <Card className="shadow-lg mb-8" data-testid="card-enhanced-visual-comparison">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-primary" />
              Enhanced Visual Analysis
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Interactive charts and visualizations for deeper insights
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {chartTypes.map((chart) => {
              const IconComponent = chart.icon;
              return (
                <Button
                  key={chart.type}
                  variant={activeChart === chart.type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveChart(chart.type)}
                  className="flex items-center"
                  data-testid={`button-chart-${chart.type}`}
                >
                  <IconComponent className="mr-1 h-4 w-4" />
                  <span className="hidden sm:inline">{chart.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="min-h-[320px]">
          {renderChart()}
        </div>
        {metrics.some(m => m.enrichedFields) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-4 p-3 bg-accent/10 rounded-lg border border-accent/20"
          >
            <p className="text-xs text-muted-foreground">
              📊 Some data may include web-sourced supplemental information with appropriate disclaimers.
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}