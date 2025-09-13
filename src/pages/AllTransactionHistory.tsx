import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Search, Calendar, Filter, Edit } from 'lucide-react';
import { TransactionEditModal } from '@/components/TransactionEditModal';

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  transaction_date: string;
  description?: string;
  payment_method?: string;
  categories?: { name: string; color: string };
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
  type: 'income' | 'expense';
}

export default function AllTransactionHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all-months');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
      
      // Set up real-time subscription for transaction changes
      const channel = supabase
        .channel('transaction-history-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchData();
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
            fetchData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchTerm, selectedMonth, selectedCategory]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          *,
          categories (
            name,
            color
          )
        `)
        .eq('user_id', user?.id)
        .order('transaction_date', { ascending: false });

      if (transactionsError) throw transactionsError;

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user?.id);

      if (categoriesError) throw categoriesError;

      const typedTransactions = (transactionsData || []).map(t => ({
        ...t,
        type: t.type as 'income' | 'expense',
        categories: t.categories ? {
          name: t.categories.name || '',
          color: t.categories.color || '#9ACD32'
        } : undefined
      }));
      
      const typedCategories = (categoriesData || []).map(c => ({
        ...c,
        type: c.type as 'income' | 'expense'
      }));
      
      setTransactions(typedTransactions);
      setCategories(typedCategories);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load transaction data"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = transactions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.categories?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Month filter
    if (selectedMonth && selectedMonth !== 'all-months') {
      filtered = filtered.filter(t => {
        const transactionMonth = new Date(t.transaction_date).toISOString().slice(0, 7);
        return transactionMonth === selectedMonth;
      });
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.categories?.name === selectedCategory);
    }

    setFilteredTransactions(filtered);
  };

  const getMonthOptions = () => {
    const months = [...new Set(transactions.map(t => 
      new Date(t.transaction_date).toISOString().slice(0, 7)
    ))].sort().reverse();
    
    return months.map(month => ({
      value: month,
      label: new Date(month + '-01').toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      })
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const groupTransactionsByDate = (transactions: Transaction[]) => {
    return transactions.reduce((groups, transaction) => {
      const date = new Date(transaction.transaction_date).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
      return groups;
    }, {} as Record<string, Transaction[]>);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-dark">
        <div className="animate-pulse space-y-4 w-full max-w-md mx-auto p-4">
          <div className="h-8 bg-muted rounded"></div>
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const groupedTransactions = groupTransactionsByDate(filteredTransactions);

  return (
    <div className="min-h-screen gradient-dark">
      {/* Header */}
      <div className="glass-card rounded-none border-x-0 border-t-0 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex items-center space-x-3 md:space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(-1)}
              className="text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">All Transactions</h1>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-3 md:space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 text-base"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-12 text-base">
                <Calendar className="h-5 w-5 mr-2" />
                <SelectValue placeholder="All months" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                <SelectItem value="all-months" className="h-12 text-base">All months</SelectItem>
                {getMonthOptions().map(month => (
                  <SelectItem key={month.value} value={month.value} className="h-12 text-base">
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-12 text-base">
                <Filter className="h-5 w-5 mr-2" />
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                <SelectItem value="all" className="h-12 text-base">All categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.name} className="h-12 text-base">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{category.icon || '📄'}</span>
                      <span>{category.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="px-3 py-4 md:p-6 space-y-3 md:space-y-6 pb-20">
        {Object.keys(groupedTransactions).length === 0 ? (
          <Card className="glass-card mx-2 md:mx-0">
            <CardContent className="text-center py-12">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No transactions found</h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm || selectedMonth || selectedCategory !== 'all' 
                  ? 'Try adjusting your filters to see more results'
                  : 'Start tracking your finances to see your transaction history'}
              </p>
              <Link to="/add-transaction">
                <Button className="text-primary-foreground min-h-[44px] px-6 text-base">
                  Add Your First Transaction
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedTransactions).map(([date, dayTransactions]) => (
            <Card key={date} className="glass-card mx-2 md:mx-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg md:text-xl text-foreground">
                  {new Date(date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </CardTitle>
                <div className="text-sm md:text-base text-muted-foreground font-medium">
                  {dayTransactions.length} transaction{dayTransactions.length !== 1 ? 's' : ''}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4">
                {dayTransactions.map((transaction) => (
                  <div 
                    key={transaction.id} 
                    className="flex items-center justify-between p-3 md:p-4 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/40 transition-colors cursor-pointer min-h-[72px]"
                    onClick={() => setEditingTransaction(transaction)}
                  >
                    <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span className="text-xl md:text-2xl leading-none">📄</span>
                        <div 
                          className="w-3 h-3 md:w-4 md:h-4 rounded-full border border-white/20 flex-shrink-0"
                          style={{ backgroundColor: transaction.categories?.color || '#9ACD32' }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm md:text-base text-foreground truncate leading-tight">
                          {transaction.categories?.name || 'Uncategorized'}
                        </p>
                        <div className="flex items-center space-x-1 text-xs md:text-sm text-muted-foreground mt-0.5">
                          <span className="font-medium">
                            {new Date(transaction.transaction_date).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                          {transaction.payment_method && (
                            <>
                              <span>•</span>
                              <span className="capitalize font-medium truncate">{transaction.payment_method}</span>
                            </>
                          )}
                        </div>
                        {transaction.description && (
                          <p className="text-xs md:text-sm text-muted-foreground truncate mt-0.5">
                            {transaction.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
                      <div className="text-right">
                        <p className={`font-bold text-sm md:text-lg leading-tight ${
                          transaction.type === 'income' ? 'text-success' : 'text-destructive'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="min-h-[44px] min-w-[44px] p-2 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTransaction(transaction);
                        }}
                      >
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {editingTransaction && (
        <TransactionEditModal
          transaction={editingTransaction}
          categories={categories}
          isOpen={!!editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSave={fetchData}
        />
      )}
    </div>
  );
}