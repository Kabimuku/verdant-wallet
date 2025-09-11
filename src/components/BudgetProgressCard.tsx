import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Wallet, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { BudgetSummary, formatCurrency, getBudgetStatusColor, getBudgetStatusText } from '@/utils/budgetCalculations';

interface BudgetProgressCardProps {
  summary: BudgetSummary;
  showDetails?: boolean;
}

export function BudgetProgressCard({ summary, showDetails = true }: BudgetProgressCardProps) {
  const getStatusIcon = () => {
    switch (summary.status) {
      case 'safe':
        return TrendingUp;
      case 'warning':
        return AlertTriangle;
      case 'danger':
        return TrendingDown;
      default:
        return Wallet;
    }
  };

  const StatusIcon = getStatusIcon();

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center space-x-2">
            <Wallet className="h-4 w-4 text-primary" />
            <span>Budget</span>
          </div>
          <div className={`flex items-center space-x-1 ${getBudgetStatusColor(summary.status)}`}>
            <StatusIcon className="h-3 w-3" />
            <span className="text-xs font-medium">{getBudgetStatusText(summary.status)}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatCurrency(summary.totalSpent)}</span>
            <span>{formatCurrency(summary.totalBudget)}</span>
          </div>
          <div className="relative">
            <Progress value={Math.min(summary.percentage, 100)} className="h-2" />
            <div 
              className={`absolute top-0 h-2 rounded-full transition-all ${
                summary.status === 'safe' ? 'bg-emerald-500' :
                summary.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(summary.percentage, 100)}%` }}
            />
          </div>
        </div>

        {showDetails && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2 bg-card/50 rounded-lg">
                <div className="text-sm font-semibold text-foreground">
                  {formatCurrency(Math.max(0, summary.remaining))}
                </div>
                <div className="text-xs text-muted-foreground">Remaining</div>
              </div>
              <div className="p-2 bg-card/50 rounded-lg">
                <div className="text-sm font-semibold text-foreground">
                  {formatCurrency(Math.max(0, summary.dailyAllowance))}
                </div>
                <div className="text-xs text-muted-foreground">Daily Limit</div>
              </div>
            </div>

            {/* Status Message */}
            <div className="text-xs text-muted-foreground text-center">
              {summary.daysLeft > 0 ? (
                summary.remaining > 0 ? (
                  <>Spend up to {formatCurrency(summary.dailyAllowance)} daily for {summary.daysLeft} days</>
                ) : (
                  <>Over budget by {formatCurrency(Math.abs(summary.remaining))}</>
                )
              ) : (
                "Month ended"
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}