import React from 'react';

interface ProgressBarProps {
  label: string;
  amount: number;
  percentage: number;
  color: string;
  icon?: string;
  formatCurrency: (amount: number) => string;
}

export function ProgressBar({ label, amount, percentage, color, icon, formatCurrency }: ProgressBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {icon && <span className="text-lg">{icon}</span>}
          <span className="font-medium text-foreground">{label}</span>
        </div>
        <div className="text-right">
          <span className="text-sm font-semibold text-foreground">{percentage.toFixed(1)}%</span>
          <p className="text-xs text-muted-foreground">{formatCurrency(amount)}</p>
        </div>
      </div>
      <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ 
            width: `${percentage}%`, 
            backgroundColor: color 
          }}
        />
      </div>
    </div>
  );
}