import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface Transaction {
  amount: number;
  type: 'income' | 'expense';
  categories?: { name: string; color: string };
}

export default function Insights() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [viewType, setViewType] = useState<'income' | 'expense'>('expense');
  const [timeframe, setTimeframe] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
  const [chartData, setChartData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchInsightsData();
    }
  }, [user, viewType, timeframe]);

  const fetchInsightsData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range based on timeframe
      const now = new Date();
      let startDate: Date;
      
      switch (timeframe) {
        case 'daily':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'yearly':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
          amount,
          type,
          categories (
            name,
            color
          )
        `)
        .eq('user_id', user?.id)
        .eq('type', viewType)
        .gte('transaction_date', startDate.toISOString())
        .lte('transaction_date', now.toISOString());

      if (error) throw error;

      // Group transactions by category
      const categoryMap = new Map<string, { total: number; color: string }>();
      let total = 0;

      (transactions || []).forEach((transaction: any) => {
        const typedTransaction: Transaction = {
          ...transaction,
          type: transaction.type as 'income' | 'expense'
        };
        
        const categoryName = typedTransaction.categories?.name || 'Uncategorized';
        const categoryColor = typedTransaction.categories?.color || '#6B7280';
        const amount = Number(typedTransaction.amount);
        
        total += amount;
        
        if (categoryMap.has(categoryName)) {
          categoryMap.get(categoryName)!.total += amount;
        } else {
          categoryMap.set(categoryName, { total: amount, color: categoryColor });
        }
      });

      // Convert to chart data
      const data = Array.from(categoryMap.entries()).map(([name, { total, color }]) => ({
        name,
        value: total,
        color
      })).sort((a, b) => b.value - a.value);

      setChartData(data);
      setTotalAmount(total);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load insights data"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTimeframeLabel = () => {
    switch (timeframe) {
      case 'daily': return 'Today';
      case 'monthly': return 'This Month';
      case 'yearly': return 'This Year';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-md mx-auto p-4">
          <div className="h-8 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded-lg"></div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b p-6">
        <h1 className="text-2xl font-bold mb-4">Insights</h1>
        
        {/* Timeframe Toggle */}
        <div className="flex bg-muted rounded-lg p-1 mb-4">
          {(['daily', 'monthly', 'yearly'] as const).map((period) => (
            <Button
              key={period}
              type="button"
              variant={timeframe === period ? 'default' : 'ghost'}
              className="flex-1"
              onClick={() => setTimeframe(period)}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Button>
          ))}
        </div>
        
        {/* Type Toggle */}
        <div className="flex bg-muted rounded-lg p-1">
          <Button
            type="button"
            variant={viewType === 'income' ? 'default' : 'ghost'}
            className="flex-1"
            onClick={() => setViewType('income')}
          >
            Income
          </Button>
          <Button
            type="button"
            variant={viewType === 'expense' ? 'default' : 'ghost'}
            className="flex-1"
            onClick={() => setViewType('expense')}
          >
            Expenses
          </Button>
        </div>
      </div>

      <div className="p-6">
        {chartData.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No {viewType} data for {getTimeframeLabel().toLowerCase()}
              </p>
              <p className="text-sm text-muted-foreground">
                Add some transactions to see your insights
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Pie Chart */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{viewType.charAt(0).toUpperCase() + viewType.slice(1)} Breakdown</span>
                  <span className="text-xl font-bold">
                    {formatCurrency(totalAmount)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Legend */}
            <Card>
              <CardHeader>
                <CardTitle>Category Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {chartData.map((category, index) => {
                    const percentage = ((category.value / totalAmount) * 100).toFixed(1);
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(category.value)}</p>
                          <p className="text-sm text-muted-foreground">{percentage}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}