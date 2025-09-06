import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  transaction_date: string;
  categories?: { name: string; color: string };
  description?: string;
}

interface DayTransactions {
  [date: string]: Transaction[];
}

export default function CalendarView() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState<DayTransactions>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMonthTransactions();
    }
  }, [user, currentDate]);

  const fetchMonthTransactions = async () => {
    try {
      setLoading(true);
      
      // Get first and last day of the month
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data: transactionsData, error } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          type,
          transaction_date,
          description,
          categories (
            name,
            color
          )
        `)
        .eq('user_id', user?.id)
        .gte('transaction_date', firstDay.toISOString().split('T')[0])
        .lte('transaction_date', lastDay.toISOString().split('T')[0])
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      // Group transactions by date
      const groupedTransactions: DayTransactions = {};
      (transactionsData || []).forEach((transaction) => {
        const dateKey = transaction.transaction_date.split('T')[0];
        if (!groupedTransactions[dateKey]) {
          groupedTransactions[dateKey] = [];
        }
        groupedTransactions[dateKey].push({
          ...transaction,
          type: transaction.type as 'income' | 'expense'
        });
      });

      setTransactions(groupedTransactions);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load calendar data"
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

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const getDayTransactionSummary = (day: number) => {
    const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayTransactions = transactions[dateKey] || [];
    
    if (dayTransactions.length === 0) return null;
    
    const total = dayTransactions.reduce((sum, transaction) => {
      return transaction.type === 'income' 
        ? sum + Number(transaction.amount)
        : sum - Number(transaction.amount);
    }, 0);
    
    return { count: dayTransactions.length, total, transactions: dayTransactions };
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-md mx-auto p-4">
          <div className="h-12 bg-muted rounded-lg"></div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b p-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <h1 className="text-xl font-bold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h1>
          
          <Button variant="ghost" onClick={() => navigateMonth('next')}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-6">
        <Card>
          <CardContent className="p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {dayNames.map(day => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
              {getDaysInMonth().map((day, index) => {
                if (day === null) {
                  return <div key={index} className="h-16"></div>;
                }
                
                const summary = getDayTransactionSummary(day);
                const isToday = 
                  day === new Date().getDate() &&
                  currentDate.getMonth() === new Date().getMonth() &&
                  currentDate.getFullYear() === new Date().getFullYear();
                
                return (
                  <div 
                    key={day} 
                    className={`h-16 border rounded-lg p-1 relative ${
                      isToday ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className={`text-sm font-medium ${
                      isToday ? 'text-primary' : 'text-foreground'
                    }`}>
                      {day}
                    </div>
                    
                    {summary && (
                      <div className="absolute bottom-1 left-1 right-1">
                        <div 
                          className={`w-2 h-2 rounded-full mx-auto mb-1 ${
                            summary.total >= 0 ? 'bg-success' : 'bg-destructive'
                          }`}
                        />
                        <div className="text-xs text-center text-muted-foreground truncate">
                          {Math.abs(summary.total) > 999 
                            ? `₹${(Math.abs(summary.total) / 1000).toFixed(0)}k`
                            : `₹${Math.abs(summary.total).toFixed(0)}`
                          }
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent transactions for current month */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>This Month's Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(transactions).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No transactions this month</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(transactions)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .slice(0, 10)
                  .map(([date, dayTransactions]) => (
                    <div key={date}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">
                          {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </h4>
                        <Badge variant="outline">
                          {dayTransactions.length} transaction{dayTransactions.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 ml-4">
                        {dayTransactions.map((transaction) => (
                          <div key={transaction.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: transaction.categories?.color || '#6B7280' }}
                              />
                              <div>
                                <p className="text-sm font-medium">
                                  {transaction.categories?.name || 'Uncategorized'}
                                </p>
                                {transaction.description && (
                                  <p className="text-xs text-muted-foreground">{transaction.description}</p>
                                )}
                              </div>
                            </div>
                            <p className={`text-sm font-bold ${
                              transaction.type === 'income' ? 'text-success' : 'text-destructive'
                            }`}>
                              {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}