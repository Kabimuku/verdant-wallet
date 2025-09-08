import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyStats, setMonthlyStats] = useState({ income: 0, expenses: 0, balance: 0 });

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

      // Type the transactions and store all
      const typedTransactions = (transactionsData || []).map(t => ({
        ...t,
        type: t.type as 'income' | 'expense',
        categories: t.categories ? {
          name: t.categories.name || '',
          color: t.categories.color || '#9ACD32'
        } : undefined
      }));

      setAllTransactions(typedTransactions);

      // Group transactions by date
      const groupedTransactions: DayTransactions = {};
      typedTransactions.forEach((transaction) => {
        const dateKey = transaction.transaction_date.split('T')[0];
        if (!groupedTransactions[dateKey]) {
          groupedTransactions[dateKey] = [];
        }
        groupedTransactions[dateKey].push(transaction);
      });

      setTransactions(groupedTransactions);
      
      // Calculate monthly stats
      const income = typedTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const expenses = typedTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      setMonthlyStats({
        income,
        expenses,
        balance: income - expenses
      });
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
    <div className="min-h-screen gradient-dark">
      {/* Header */}
      <div className="glass-card rounded-none border-x-0 border-t-0 p-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => navigateMonth('prev')} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <h1 className="text-xl font-bold text-foreground">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h1>
          
          <Button variant="ghost" onClick={() => navigateMonth('next')} className="text-muted-foreground hover:text-foreground">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-6 pb-24">
        {/* Monthly Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Income</p>
              <p className="text-lg font-bold text-success">{formatCurrency(monthlyStats.income)}</p>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Expenses</p>
              <p className="text-lg font-bold text-destructive">{formatCurrency(monthlyStats.expenses)}</p>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Balance</p>
              <p className={`text-lg font-bold ${monthlyStats.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(monthlyStats.balance)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card">
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
                        <div className="text-xs text-center text-foreground font-medium">
                          {formatCurrency(Math.abs(summary.total))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        
        {/* Latest Transactions */}
        <Card className="glass-card mt-6">
          <CardHeader>
            <CardTitle className="text-lg text-foreground flex items-center justify-between">
              <span>Latest Transactions</span>
              <Link to="/transactions">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  View All
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allTransactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No recent transactions</p>
                <Link to="/add-transaction">
                  <Button className="text-primary-foreground">Add Transaction</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {allTransactions.slice(0, 10).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">📄</span>
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: transaction.categories?.color || '#9ACD32' }}
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{transaction.categories?.name || 'Uncategorized'}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.transaction_date).toLocaleDateString()} • {new Date(transaction.transaction_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${
                        transaction.type === 'income' ? 'text-success' : 'text-destructive'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
                      </p>
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