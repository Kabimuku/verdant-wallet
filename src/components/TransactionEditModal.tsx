import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Save } from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  transaction_date: string;
  description?: string;
  payment_method?: string;
  category_id?: string;
  categories?: { name: string; color: string; icon?: string };
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
  type: 'income' | 'expense';
}

interface TransactionEditModalProps {
  transaction: Transaction;
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function TransactionEditModal({ 
  transaction, 
  categories, 
  isOpen, 
  onClose, 
  onSave 
}: TransactionEditModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    amount: transaction.amount.toString(),
    type: transaction.type,
    category_id: transaction.category_id || '',
    transaction_date: transaction.transaction_date.split('T')[0],
    transaction_time: new Date(transaction.transaction_date).toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    payment_method: transaction.payment_method || 'cash',
    description: transaction.description || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);
      
      const dateTime = new Date(`${formData.transaction_date}T${formData.transaction_time}`);
      
      const { error } = await supabase
        .from('transactions')
        .update({
          amount: parseFloat(formData.amount),
          type: formData.type,
          category_id: formData.category_id || null,
          transaction_date: dateTime.toISOString(),
          payment_method: formData.payment_method,
          description: formData.description.trim() || null
        })
        .eq('id', transaction.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Transaction updated successfully"
      });

      onSave();
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update transaction"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transaction.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Transaction deleted successfully"
      });

      onSave();
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete transaction"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(cat => cat.type === formData.type);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-border max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center justify-between">
            <span>Edit Transaction</span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass-card border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-foreground">Delete Transaction</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    Are you sure you want to delete this transaction? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="Enter amount"
            />
          </div>

          {/* Type Toggle */}
          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <div className="flex items-center space-x-2">
              <span className={`text-sm ${formData.type === 'expense' ? 'text-foreground' : 'text-muted-foreground'}`}>
                Expense
              </span>
              <Switch
                checked={formData.type === 'income'}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ 
                    ...prev, 
                    type: checked ? 'income' : 'expense',
                    category_id: '' // Reset category when type changes
                  }))
                }
              />
              <span className={`text-sm ${formData.type === 'income' ? 'text-foreground' : 'text-muted-foreground'}`}>
                Income
              </span>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select 
              value={formData.category_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center space-x-2">
                      <span>{category.icon || '📄'}</span>
                      <span>{category.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.transaction_date}
                onChange={(e) => setFormData(prev => ({ ...prev, transaction_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={formData.transaction_time}
                onChange={(e) => setFormData(prev => ({ ...prev, transaction_time: e.target.value }))}
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="payment">Payment Method</Label>
            <Select 
              value={formData.payment_method} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">💵 Cash</SelectItem>
                <SelectItem value="card">💳 Card</SelectItem>
                <SelectItem value="upi">📱 UPI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add a note about this transaction"
              rows={3}
            />
          </div>

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            disabled={loading || !formData.amount}
            className="w-full text-primary-foreground"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}