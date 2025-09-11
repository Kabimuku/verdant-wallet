import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Calendar, Target } from 'lucide-react';

interface Budget {
  id: string;
  amount: number;
  month: number;
  year: number;
  category_id: string | null;
  category?: {
    name: string;
    color: string;
  };
}

interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  dailyAllowance: number;
  daysLeft: number;
  percentage: number;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

export default function Budget() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<BudgetSummary>({
    totalBudget: 0,
    totalSpent: 0,
    remaining: 0,
    dailyAllowance: 0,
    daysLeft: 0,
    percentage: 0
  });
  
  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchBudgets(),
        fetchCategories(),
        calculateSummary()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBudgets = async () => {
    const { data, error } = await supabase
      .from('budgets')
      .select(`
        *,
        categories (
          name,
          color
        )
      `)
      .eq('user_id', user?.id)
      .eq('month', currentMonth)
      .eq('year', currentYear);

    if (error) throw error;
    setBudgets(data || []);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user?.id)
      .order('name');

    if (error) throw error;
    setCategories(data || []);
  };

  const calculateSummary = async () => {
    try {
      // Get total budget for current month
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('amount')
        .eq('user_id', user?.id)
        .eq('month', currentMonth)
        .eq('year', currentYear);

      if (budgetError) throw budgetError;

      const totalBudget = budgetData?.reduce((sum, b) => sum + Number(b.amount), 0) || 0;

      // Get total spent for current month
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
      const endOfMonth = new Date(currentYear, currentMonth, 0);

      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user?.id)
        .eq('type', 'expense')
        .gte('transaction_date', startOfMonth.toISOString())
        .lte('transaction_date', endOfMonth.toISOString());

      if (transactionError) throw transactionError;

      const totalSpent = transactionData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const remaining = totalBudget - totalSpent;
      const daysLeft = Math.max(0, endOfMonth.getDate() - currentDate.getDate() + 1);
      const dailyAllowance = daysLeft > 0 ? remaining / daysLeft : 0;
      const percentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

      setSummary({
        totalBudget,
        totalSpent,
        remaining,
        dailyAllowance,
        daysLeft,
        percentage
      });
    } catch (error) {
      console.error('Error calculating summary:', error);
    }
  };

  const handleAddBudget = async () => {
    if (!newBudgetAmount || !selectedCategory) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter an amount and select a category"
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('budgets')
        .upsert({
          user_id: user?.id,
          amount: parseFloat(newBudgetAmount),
          category_id: selectedCategory === 'total' ? null : selectedCategory,
          month: currentMonth,
          year: currentYear
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Budget saved successfully"
      });

      setNewBudgetAmount('');
      setSelectedCategory('');
      await fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage <= 60) return 'bg-emerald-500';
    if (percentage <= 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getBudgetStatus = (percentage: number) => {
    if (percentage <= 60) return { icon: TrendingUp, color: 'text-emerald-500', text: 'On Track' };
    if (percentage <= 80) return { icon: AlertTriangle, color: 'text-yellow-500', text: 'Approaching Limit' };
    return { icon: TrendingDown, color: 'text-red-500', text: 'Over Budget' };
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-dark p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded-lg w-48"></div>
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-48 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  const status = getBudgetStatus(summary.percentage);
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen gradient-dark">
      <div className="p-6 space-y-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Budget Management</h1>
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Monthly Overview */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-primary" />
              <span>Monthly Overview</span>
              <div className={`flex items-center space-x-1 ml-auto ${status.color}`}>
                <StatusIcon className="h-4 w-4" />
                <span className="text-sm font-medium">{status.text}</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Spent: {formatCurrency(summary.totalSpent)}</span>
                <span className="text-muted-foreground">Budget: {formatCurrency(summary.totalBudget)}</span>
              </div>
              <div className="relative">
                <Progress 
                  value={Math.min(summary.percentage, 100)} 
                  className="h-3"
                />
                <div 
                  className={`absolute top-0 h-3 rounded-full transition-all ${getProgressColor(summary.percentage)}`}
                  style={{ width: `${Math.min(summary.percentage, 100)}%` }}
                />
              </div>
              <div className="text-center">
                <span className="text-lg font-bold text-foreground">
                  {summary.percentage.toFixed(1)}% Used
                </span>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-card/50 rounded-lg">
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(Math.max(0, summary.remaining))}
                </div>
                <div className="text-sm text-muted-foreground">Remaining</div>
              </div>
              <div className="text-center p-4 bg-card/50 rounded-lg">
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(Math.max(0, summary.dailyAllowance))}
                </div>
                <div className="text-sm text-muted-foreground">Daily Allowance</div>
              </div>
            </div>

            {/* Daily Spending Guide */}
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">Daily Spending Guide</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {summary.daysLeft > 0 ? (
                  summary.remaining > 0 ? (
                    <>You can spend up to <strong>{formatCurrency(summary.dailyAllowance)}</strong> per day for the next {summary.daysLeft} days.</>
                  ) : (
                    <>You're <strong>{formatCurrency(Math.abs(summary.remaining))}</strong> over budget this month.</>
                  )
                ) : (
                  "End of month reached."
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Budget */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Set Budget</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Budget Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={newBudgetAmount}
                  onChange={(e) => setNewBudgetAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total">Total Monthly Budget</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          <span>{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button 
              onClick={handleAddBudget} 
              className="w-full"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Budget'}
            </Button>
          </CardContent>
        </Card>

        {/* Category Budgets */}
        {budgets.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Category Budgets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {budgets.map((budget) => (
                  <div key={budget.id} className="flex items-center justify-between p-4 bg-card/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {budget.category && (
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: budget.category.color }}
                        />
                      )}
                      <span className="font-medium text-foreground">
                        {budget.category?.name || 'Total Budget'}
                      </span>
                    </div>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(budget.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}