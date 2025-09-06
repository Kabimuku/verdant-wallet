import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Plus, TrendingUp, TrendingDown, Calendar, Eye, EyeOff } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  transaction_date: string;
  categories?: { name: string; color: string };
}

interface BalanceData {
  date: string;
  balance: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balanceData, setBalanceData] = useState<BalanceData[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch transactions with categories
      const { data: transactionsData, error } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          type,
          transaction_date,
          categories (
            name,
            color
          )
        `)
        .eq('user_id', user?.id)
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      const typedTransactions = (transactionsData || []).map(t => ({
        ...t,
        type: t.type as 'income' | 'expense'
      }));
      setTransactions(typedTransactions);

      // Calculate totals
      const total = typedTransactions.reduce((sum, transaction) => {
        return transaction.type === 'income' 
          ? sum + Number(transaction.amount)
          : sum - Number(transaction.amount);
      }, 0);
      setTotalBalance(total);

      // Calculate monthly income and expenses
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const monthlyData = typedTransactions.filter(transaction => {
        const transactionDate = new Date(transaction.transaction_date);
        return transactionDate.getMonth() === currentMonth && 
               transactionDate.getFullYear() === currentYear;
      });

      const income = monthlyData
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const expenses = monthlyData
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      setMonthlyIncome(income);
      setMonthlyExpenses(expenses);

      // Generate balance history for chart
      const balanceHistory = generateBalanceHistory(typedTransactions);
      setBalanceData(balanceHistory);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load dashboard data"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateBalanceHistory = (transactions: Transaction[]) => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    return last7Days.map(date => {
      const dayTransactions = transactions.filter(t => 
        t.transaction_date.split('T')[0] === date
      );
      
      const dayBalance = dayTransactions.reduce((sum, transaction) => {
        return transaction.type === 'income' 
          ? sum + Number(transaction.amount)
          : sum - Number(transaction.amount);
      }, 0);

      return {
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        balance: dayBalance
      };
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-md mx-auto p-4">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-48 bg-muted rounded-lg"></div>
          <div className="h-32 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-dark relative">
      {/* Header */}
      <div className="gradient-dark p-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Hi {user?.email?.split('@')[0]}</h1>
              <p className="text-muted-foreground text-sm">Welcome back!</p>
            </div>
          </div>
        </div>

        {/* Total Balance */}
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Total Balance</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBalance(!showBalance)}
                className="text-muted-foreground hover:text-foreground p-1 h-auto"
              >
                {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {showBalance ? formatCurrency(totalBalance) : '••••••••'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Floating Add Button */}
      <Link to="/add-transaction">
        <Button 
          size="icon" 
          className="fixed bottom-20 right-6 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-soft z-50"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </Link>

      <div className="p-6 space-y-6 pb-24">
        {/* Balance Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Balance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={balanceData}>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} className="text-xs fill-muted-foreground" />
                  <YAxis hide />
                  <Line 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Overview */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">This Month's Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-success/20 rounded-xl border border-success/30">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-success rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-success-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Income</p>
                  <p className="text-sm text-muted-foreground">This month</p>
                </div>
              </div>
              <p className="text-xl font-bold text-success">{formatCurrency(monthlyIncome)}</p>
            </div>

            <div className="flex items-center justify-between p-4 bg-destructive/20 rounded-xl border border-destructive/30">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-destructive rounded-full flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-destructive-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Expenses</p>
                  <p className="text-sm text-muted-foreground">This month</p>
                </div>
              </div>
              <p className="text-xl font-bold text-destructive">{formatCurrency(monthlyExpenses)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-foreground">Recent Transactions</CardTitle>
            <Link to="/calendar">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Calendar className="h-4 w-4 mr-2" />
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No transactions yet</p>
                <Link to="/add-transaction">
                  <Button className="bg-primary hover:bg-primary/90">Add Your First Transaction</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: transaction.categories?.color || 'hsl(var(--primary))' }}
                      />
                      <div>
                        <p className="font-semibold text-foreground">{transaction.categories?.name || 'Uncategorized'}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.transaction_date).toLocaleDateString()}
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