import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Plus, TrendingUp, TrendingDown, Calendar, Eye, EyeOff, Wallet, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { calculateBudgetSummary, formatCurrency, getBudgetStatusColor, getBudgetStatusText, generateBudgetRecommendation, BudgetSummary } from '@/utils/budgetCalculations';

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
  const [dailyIncome, setDailyIncome] = useState(0);
  const [dailyExpenses, setDailyExpenses] = useState(0);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
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

      // Calculate today's income and expenses
      const today = new Date().toISOString().split('T')[0];
      const todayTransactions = typedTransactions.filter(transaction => 
        transaction.transaction_date.split('T')[0] === today
      );
      
      const todayIncome = todayTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const todayExpenses = todayTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      setDailyIncome(todayIncome);
      setDailyExpenses(todayExpenses);

      // Generate balance history for chart
      const balanceHistory = generateBalanceHistory(typedTransactions);
      setBalanceData(balanceHistory);

      // Fetch and calculate budget summary
      await fetchBudgetSummary(typedTransactions);

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

  const fetchBudgetSummary = async (transactions: Transaction[]) => {
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      // Fetch current month's budgets
      const { data: budgetData, error } = await supabase
        .from('budgets')
        .select('amount, category_id')
        .eq('user_id', user?.id)
        .eq('month', currentMonth)
        .eq('year', currentYear);

      if (error) throw error;

      if (budgetData && budgetData.length > 0) {
        const summary = calculateBudgetSummary(budgetData, transactions, currentMonth, currentYear);
        setBudgetSummary(summary);
      }
    } catch (error) {
      console.error('Error fetching budget summary:', error);
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
                <LineChart data={balanceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    className="text-xs fill-muted-foreground" 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    className="text-xs fill-muted-foreground"
                    tickFormatter={(value) => `₹${Math.abs(value) > 999 ? (value/1000).toFixed(0) + 'k' : value}`}
                  />
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Line 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                    fill="url(#balanceGradient)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Budget Summary */}
        {budgetSummary && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg text-foreground">
                <div className="flex items-center space-x-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  <span>Budget Status</span>
                </div>
                <Link to="/budget">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    Manage
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {formatCurrency(budgetSummary.totalSpent)} of {formatCurrency(budgetSummary.totalBudget)}
                </span>
                <span className={`text-sm font-medium ${getBudgetStatusColor(budgetSummary.status)}`}>
                  {getBudgetStatusText(budgetSummary.status)}
                </span>
              </div>
              
              <div className="relative">
                <div className="w-full bg-muted/30 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      budgetSummary.status === 'safe' ? 'bg-emerald-500' :
                      budgetSummary.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(budgetSummary.percentage, 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center space-x-2">
                  {budgetSummary.status === 'danger' ? (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  ) : (
                    <Wallet className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="text-right flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {generateBudgetRecommendation(budgetSummary)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Monthly Overview */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">This Month's Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Income Card */}
            <div 
              className="flex items-center min-h-[72px] p-4 bg-success/20 rounded-xl border border-success/30 touch-target"
              role="button"
              tabIndex={0}
              aria-label={`Income: Today ${formatCurrency(dailyIncome)}, This month ${formatCurrency(monthlyIncome)}`}
            >
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                <div className="w-12 h-12 bg-success rounded-full flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-success-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="font-semibold text-foreground text-sm truncate">Income</p>
                    <p className="text-lg font-bold text-success truncate">+{formatCurrency(dailyIncome)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <p className="text-xs text-muted-foreground truncate">This month</p>
                    <p className="text-sm font-medium text-success/80 truncate">{formatCurrency(monthlyIncome)}</p>
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <p className="text-2xl font-bold text-success leading-none">{formatCurrency(dailyIncome)}</p>
              </div>
            </div>

            {/* Expenses Card */}
            <div 
              className="flex items-center min-h-[72px] p-4 bg-destructive/20 rounded-xl border border-destructive/30 touch-target"
              role="button"
              tabIndex={0}
              aria-label={`Expenses: Today ${formatCurrency(dailyExpenses)}, This month ${formatCurrency(monthlyExpenses)}`}
            >
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                <div className="w-12 h-12 bg-destructive rounded-full flex items-center justify-center flex-shrink-0">
                  <TrendingDown className="h-6 w-6 text-destructive-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="font-semibold text-foreground text-sm truncate">Expenses</p>
                    <p className="text-lg font-bold text-destructive truncate">-{formatCurrency(dailyExpenses)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <p className="text-xs text-muted-foreground truncate">This month</p>
                    <p className="text-sm font-medium text-destructive/80 truncate">{formatCurrency(monthlyExpenses)}</p>
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <p className="text-2xl font-bold text-destructive leading-none">{formatCurrency(dailyExpenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-foreground">Recent Transactions</CardTitle>
            <Link to="/transactions">
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