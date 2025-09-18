import { motion } from 'framer-motion';

interface PriceScaleProps {
  currentPrice?: number | null;
  weekHigh52?: number | null;
  weekLow52?: number | null;
  companyColor: string;
  className?: string;
}

export default function PriceScale({ 
  currentPrice, 
  weekHigh52, 
  weekLow52, 
  companyColor, 
  className = "" 
}: PriceScaleProps) {
  // Return placeholder if data is missing
  if (!currentPrice || !weekHigh52 || !weekLow52) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className="text-xs text-muted-foreground">Price data not available</span>
      </div>
    );
  }

  // Calculate position of current price on scale (0-100%)
  const range = weekHigh52 - weekLow52;
  const position = range > 0 ? ((currentPrice - weekLow52) / range) * 100 : 50;
  const safePosition = Math.max(0, Math.min(100, position));

  // Determine performance status
  const getPerformanceStatus = () => {
    if (safePosition >= 80) return { label: 'Strong', color: '#10b981' };
    if (safePosition >= 60) return { label: 'Good', color: '#84cc16' };
    if (safePosition >= 40) return { label: 'Moderate', color: '#f59e0b' };
    if (safePosition >= 20) return { label: 'Weak', color: '#f97316' };
    return { label: 'Poor', color: '#ef4444' };
  };

  const performanceStatus = getPerformanceStatus();

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return `$${(price / 1000).toFixed(1)}K`;
    }
    return `$${price.toFixed(2)}`;
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Price Scale Header */}
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-muted-foreground">52-Week Range</span>
        <div className="flex items-center space-x-1">
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: performanceStatus.color }}
          />
          <span className="text-xs font-medium" style={{ color: performanceStatus.color }}>
            {performanceStatus.label}
          </span>
        </div>
      </div>

      {/* Visual Scale */}
      <div className="relative">
        {/* Scale Track */}
        <div className="h-2 bg-muted rounded-full relative overflow-hidden">
          {/* Gradient Background */}
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: `linear-gradient(to right, #ef4444 0%, #f97316 25%, #f59e0b 50%, #84cc16 75%, #10b981 100%)`
            }}
          />
          
          {/* Current Price Indicator */}
          <motion.div
            initial={{ scale: 0, x: '-50%' }}
            animate={{ scale: 1, x: '-50%' }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-lg z-10"
            style={{ 
              left: `${safePosition}%`,
              backgroundColor: companyColor
            }}
          />
        </div>

        {/* Price Labels */}
        <div className="flex justify-between mt-1">
          <div className="text-left">
            <div className="text-xs text-muted-foreground">Low</div>
            <div className="text-xs font-medium">{formatPrice(weekLow52)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Current</div>
            <div className="text-xs font-bold" style={{ color: companyColor }}>
              {formatPrice(currentPrice)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">High</div>
            <div className="text-xs font-medium">{formatPrice(weekHigh52)}</div>
          </div>
        </div>

        {/* Position Percentage */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="text-center mt-1"
        >
          <span className="text-xs text-muted-foreground">
            {safePosition.toFixed(0)}% of 52-week range
          </span>
        </motion.div>
      </div>
    </div>
  );
}