import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ProgressBar } from '@/components/ProgressBar';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface CategoryData {
  name: string;
  value: number;
  color: string;
  icon?: string;
}

interface Transaction {
  amount: number;
  type: 'income' | 'expense';
  categories?: { name: string; color: string; icon?: string };
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
      
      // Set up real-time subscription for transaction and category changes
      const channel = supabase
        .channel('insights-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchInsightsData();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'categories',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchInsightsData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
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
            color,
            icon
          )
        `)
        .eq('user_id', user?.id)
        .eq('type', viewType)
        .gte('transaction_date', startDate.toISOString())
        .lte('transaction_date', now.toISOString());

      if (error) throw error;

      // Group transactions by category
      const categoryMap = new Map<string, { total: number; color: string; icon?: string }>();
      let total = 0;

      (transactions || []).forEach((transaction: any) => {
        const typedTransaction: Transaction = {
          ...transaction,
          type: transaction.type as 'income' | 'expense'
        };
        
        const categoryName = typedTransaction.categories?.name || 'Uncategorized';
        const categoryColor = typedTransaction.categories?.color || '#6B7280';
        const categoryIcon = typedTransaction.categories?.icon || '📄';
        const amount = Number(typedTransaction.amount);
        
        total += amount;
        
        if (categoryMap.has(categoryName)) {
          categoryMap.get(categoryName)!.total += amount;
        } else {
          categoryMap.set(categoryName, { total: amount, color: categoryColor, icon: categoryIcon });
        }
      });

      // Convert to chart data
      const data = Array.from(categoryMap.entries()).map(([name, { total, color, icon }]) => ({
        name,
        value: total,
        color,
        icon
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
    <div className="min-h-screen gradient-dark">
      {/* Header */}
      <div className="glass-card rounded-none border-x-0 border-t-0 p-6">
        <h1 className="text-2xl font-bold mb-4 text-foreground">Insights</h1>
        
        {/* Timeframe Toggle */}
        <div className="flex bg-muted/30 rounded-xl p-1 mb-4">
          {(['daily', 'monthly', 'yearly'] as const).map((period) => (
            <Button
              key={period}
              type="button"
              variant={timeframe === period ? 'default' : 'ghost'}
              className="flex-1 text-foreground"
              onClick={() => setTimeframe(period)}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Button>
          ))}
        </div>
        
        {/* Type Toggle */}
        <div className="flex bg-muted/30 rounded-xl p-1">
          <Button
            type="button"
            variant={viewType === 'income' ? 'default' : 'ghost'}
            className="flex-1 text-foreground"
            onClick={() => setViewType('income')}
          >
            Income
          </Button>
          <Button
            type="button"
            variant={viewType === 'expense' ? 'default' : 'ghost'}
            className="flex-1 text-foreground"
            onClick={() => setViewType('expense')}
          >
            Expenses
          </Button>
        </div>
      </div>

      <div className="p-6 pb-24">
        {chartData.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="text-center py-12">
              <div className="w-32 h-32 mx-auto mb-6 bg-muted/30 rounded-full flex items-center justify-center">
                <div className="text-6xl mb-4">📊</div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No {viewType} data for {getTimeframeLabel().toLowerCase()}
              </h3>
              <p className="text-muted-foreground mb-6">
                Start tracking your finances to see detailed insights and beautiful progress charts
              </p>
              <div className="space-y-3">
                <Link to="/add-transaction">
                  <Button className="w-full text-primary-foreground">
                    Add Your First Transaction
                  </Button>
                </Link>
                <p className="text-xs text-muted-foreground">
                  Track your {viewType} to see category breakdowns and spending patterns
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Pie Chart */}
            <Card className="glass-card mb-6">
              <CardHeader>
                <CardTitle className="text-center text-foreground text-lg md:text-xl">
                  {viewType.charAt(0).toUpperCase() + viewType.slice(1)} Distribution - {getTimeframeLabel()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 md:h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) => 
                          `${name}: ${(percent * 100).toFixed(1)}%`
                        }
                        outerRadius={window.innerWidth < 768 ? 80 : 100}
                        fill="#8884d8"
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={800}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), 'Amount']}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                      />
                      <Legend 
                        wrapperStyle={{
                          paddingTop: '20px',
                          fontSize: '14px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Progress Bars */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-foreground text-lg md:text-xl">
                  <span>Category Breakdown</span>
                  <span className="text-xl md:text-2xl font-bold text-primary">
                    {formatCurrency(totalAmount)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 md:space-y-6">
                {chartData.map((category, index) => {
                  const percentage = (category.value / totalAmount) * 100;
                  
                  return (
                    <ProgressBar
                      key={index}
                      label={category.name}
                      amount={category.value}
                      percentage={percentage}
                      color={category.color}
                      icon={category.icon || '📊'}
                      formatCurrency={formatCurrency}
                    />
                  );
                })}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}