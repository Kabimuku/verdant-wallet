import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, AlertTriangle, Wallet } from 'lucide-react';
import { calculateBudgetSummary, formatCurrency, BudgetSummary } from '@/utils/budgetCalculations';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
}

export default function AddTransaction() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [budgetImpact, setBudgetImpact] = useState<{remaining: number; willExceed: boolean} | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    categoryId: '',
    description: '',
    paymentMethod: 'cash',
    transactionDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchCategories();
  }, [user, transactionType]);

  useEffect(() => {
    if (transactionType === 'expense' && formData.amount) {
      checkBudgetImpact();
    }
  }, [formData.amount, transactionType]);

  const checkBudgetImpact = async () => {
    if (!user || !formData.amount || transactionType !== 'expense') {
      setBudgetImpact(null);
      return;
    }

    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const transactionAmount = parseFloat(formData.amount);

      // Get current month's budget
      const { data: budgetData } = await supabase
        .from('budgets')
        .select('amount')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .eq('year', currentYear);

      if (!budgetData || budgetData.length === 0) return;

      const totalBudget = budgetData.reduce((sum, b) => sum + Number(b.amount), 0);

      // Get current month's expenses
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
      const endOfMonth = new Date(currentYear, currentMonth, 0);

      const { data: transactionData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('transaction_date', startOfMonth.toISOString())
        .lte('transaction_date', endOfMonth.toISOString());

      const currentSpent = transactionData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const remaining = totalBudget - currentSpent;
      const willExceed = transactionAmount > remaining;

      setBudgetImpact({ remaining, willExceed });
    } catch (error) {
      console.error('Error checking budget impact:', error);
    }
  };

  const fetchCategories = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', transactionType)
        .order('name');

      if (error) throw error;
      const typedCategories = (data || []).map(cat => ({
        ...cat,
        type: cat.type as 'income' | 'expense'
      }));
      setCategories(typedCategories);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load categories"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.categoryId) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all required fields"
      });
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user?.id,
          amount: parseFloat(formData.amount),
          type: transactionType,
          category_id: formData.categoryId,
          description: formData.description || null,
          payment_method: formData.paymentMethod,
          transaction_date: new Date(formData.transactionDate).toISOString()
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Transaction added successfully"
      });
      
      navigate('/');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add transaction"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-dark">
      {/* Header */}
      <div className="glass-card rounded-none border-x-0 border-t-0 p-4">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="p-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Add Transaction</h1>
        </div>
      </div>

      <div className="p-6 pb-24">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Transaction Type Toggle */}
          <div className="flex bg-muted/30 rounded-xl p-1">
            <Button
              type="button"
              variant={transactionType === 'income' ? 'default' : 'ghost'}
              className="flex-1 bg-primary data-[state=active]:bg-primary"
              onClick={() => {
                setTransactionType('income');
                setFormData(prev => ({ ...prev, categoryId: '' }));
              }}
            >
              Income
            </Button>
            <Button
              type="button"
              variant={transactionType === 'expense' ? 'default' : 'ghost'}
              className="flex-1 bg-primary data-[state=active]:bg-primary"
              onClick={() => {
                setTransactionType('expense');
                setFormData(prev => ({ ...prev, categoryId: '' }));
              }}
            >
              Expense
            </Button>
          </div>

          {/* Amount */}
          <Card className="glass-card">
            <CardContent className="p-4">
              <Label htmlFor="amount" className="text-foreground font-medium">Amount *</Label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-8 text-lg bg-transparent border-border/50 text-foreground"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Budget Impact Warning */}
          {budgetImpact && transactionType === 'expense' && (
            <Card className={`${budgetImpact.willExceed ? 'bg-destructive/10 border-destructive/30' : 'bg-primary/10 border-primary/30'}`}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    budgetImpact.willExceed ? 'bg-destructive/20' : 'bg-primary/20'
                  }`}>
                    {budgetImpact.willExceed ? (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    ) : (
                      <Wallet className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${budgetImpact.willExceed ? 'text-destructive' : 'text-foreground'}`}>
                      {budgetImpact.willExceed ? 'Budget Alert' : 'Budget Impact'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {budgetImpact.willExceed 
                        ? `This expense will exceed your remaining budget by ${formatCurrency(parseFloat(formData.amount) - budgetImpact.remaining)}`
                        : `${formatCurrency(budgetImpact.remaining - parseFloat(formData.amount))} will remain after this expense`
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.categoryId} onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="bg-card border z-50">
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

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional notes..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.transactionDate}
              onChange={(e) => setFormData(prev => ({ ...prev, transactionDate: e.target.value }))}
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="payment">Payment Method</Label>
            <Select value={formData.paymentMethod} onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border z-50">
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full py-6 text-lg rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-soft"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Transaction'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}