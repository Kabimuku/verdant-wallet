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
import { ArrowLeft, Loader2 } from 'lucide-react';

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