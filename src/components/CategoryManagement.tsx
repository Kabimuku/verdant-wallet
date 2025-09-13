import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, GripVertical, Search, RotateCcw, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import EmojiPickerComponent from '@/components/EmojiPicker';

interface Category {
  id: string;
  name: string;
  color: string;
  type: 'income' | 'expense';
  icon?: string;
  transaction_count?: number;
  user_id?: string;
}

// Default emojis for new categories
const defaultEmojis = {
  income: ['💰', '💼', '📈', '🎁', '💵', '🏦'],
  expense: ['🍽️', '🚗', '🛍️', '📄', '🎬', '🏥', '📚', '✈️']
};

export default function CategoryManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', color: '#9ACD32', type: 'expense', icon: '📄' });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user]);

  useEffect(() => {
    filterCategories();
  }, [categories, searchTerm, filterType]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      
      // Fetch categories with transaction counts
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user?.id)
        .order('name');

      if (categoriesError) throw categoriesError;

      // Fetch transaction counts for each category
      const categoriesWithCounts = await Promise.all(
        (categoriesData || []).map(async (category) => {
          const { count } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id);
          
          return { 
            ...category, 
            type: category.type as 'income' | 'expense',
            transaction_count: count || 0 
          };
        })
      );

      setCategories(categoriesWithCounts);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load categories"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterCategories = () => {
    let filtered = categories;
    
    if (filterType !== 'all') {
      filtered = filtered.filter(cat => cat.type === filterType);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(cat => 
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredCategories(filtered);
  };

  const handleSaveCategory = async () => {
    try {
      setIsUpdating(true);
      
      const categoryData = editingCategory 
        ? { 
            id: editingCategory.id,
            name: newCategory.name,
            color: newCategory.color,
            type: newCategory.type,
            icon: newCategory.icon,
            user_id: editingCategory.user_id
          }
        : { 
            name: newCategory.name,
            color: newCategory.color,
            type: newCategory.type,
            icon: newCategory.icon,
            user_id: user?.id!
          };

      const { error } = editingCategory
        ? await supabase
            .from('categories')
            .update({
              name: categoryData.name,
              color: categoryData.color,
              type: categoryData.type,
              icon: categoryData.icon
            })
            .eq('id', editingCategory.id)
        : await supabase
            .from('categories')
            .insert([categoryData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Category ${editingCategory ? 'updated' : 'created'} successfully`
      });

      setIsDialogOpen(false);
      setEditingCategory(null);
      setNewCategory({ name: '', color: '#9ACD32', type: 'expense', icon: '📄' });
      await fetchCategories(); // Wait for refresh to complete
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${editingCategory ? 'update' : 'create'} category`
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Category deleted successfully"
      });

      fetchCategories();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete category"
      });
    }
  };

  const handleResetDefaults = async () => {
    try {
      // Delete existing categories
      await supabase
        .from('categories')
        .delete()
        .eq('user_id', user?.id);

      // Insert default categories with emojis
      const defaultCategories = [
        { name: 'Food & Dining', color: '#FF6B6B', type: 'expense', icon: '🍽️', user_id: user?.id },
        { name: 'Transportation', color: '#4ECDC4', type: 'expense', icon: '🚗', user_id: user?.id },
        { name: 'Shopping', color: '#45B7D1', type: 'expense', icon: '🛍️', user_id: user?.id },
        { name: 'Bills & Utilities', color: '#96CEB4', type: 'expense', icon: '📄', user_id: user?.id },
        { name: 'Entertainment', color: '#FFEAA7', type: 'expense', icon: '🎬', user_id: user?.id },
        { name: 'Salary', color: '#9ACD32', type: 'income', icon: '💰', user_id: user?.id },
        { name: 'Business', color: '#DDA0DD', type: 'income', icon: '💼', user_id: user?.id },
        { name: 'Investment', color: '#98D8C8', type: 'income', icon: '📈', user_id: user?.id },
      ];

      const { error } = await supabase
        .from('categories')
        .insert(defaultCategories);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Categories reset to defaults"
      });

      fetchCategories();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reset categories"
      });
    }
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

  return (
    <div className="min-h-screen gradient-dark">
      {/* Header */}
      <div className="glass-card rounded-none border-x-0 border-t-0 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link to="/profile">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px]">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-lg md:text-xl font-bold text-foreground">Category Manage</h1>
          </div>
        </div>
      </div>

      {/* Floating Add Button */}
      <div className="fixed top-4 right-6 z-50">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full shadow-lg min-h-[44px] min-w-[44px] p-3">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
            <DialogContent className="glass-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Category Name</Label>
                  <Input
                    id="name"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter category name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={newCategory.type} onValueChange={(value: 'income' | 'expense') => 
                    setNewCategory(prev => ({ ...prev, type: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon</Label>
                  <div className="flex items-center space-x-3">
                    <EmojiPickerComponent
                      selectedEmoji={newCategory.icon}
                      onEmojiSelect={(emoji) => setNewCategory(prev => ({ ...prev, icon: emoji }))}
                      size="lg"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">
                        Tap to choose any emoji for your category
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(newCategory.type === 'income' ? defaultEmojis.income : defaultEmojis.expense).map((emoji) => (
                          <Button
                            key={emoji}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setNewCategory(prev => ({ ...prev, icon: emoji }))}
                          >
                            <span className="text-lg">{emoji}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    type="color"
                    value={newCategory.color}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
                  />
                </div>
                
                <Button 
                  onClick={handleSaveCategory} 
                  className="w-full text-primary-foreground"
                  disabled={isUpdating || !newCategory.name.trim()}
                >
                  {isUpdating ? 'Saving...' : (editingCategory ? 'Update Category' : 'Create Category')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

      <div className="px-6 py-4 space-y-4 pb-24 pt-16">
        {/* Search and Filter */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 text-base"
                />
              </div>
              
              <Select value={filterType} onValueChange={(value: 'all' | 'income' | 'expense') => setFilterType(value)}>
                <SelectTrigger className="w-full md:w-32 h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  <SelectItem value="all" className="h-12 text-base">All</SelectItem>
                  <SelectItem value="income" className="h-12 text-base">Income</SelectItem>
                  <SelectItem value="expense" className="h-12 text-base">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Categories List */}
        <div className="space-y-3 mt-4">
          {filteredCategories.map((category) => (
            <Card key={category.id} className="glass-card">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center justify-between min-h-[60px]">
                  <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      <span className="text-xl md:text-2xl leading-none">{category.icon || '📄'}</span>
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm md:text-lg text-foreground truncate leading-tight">{category.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center ${
                          category.type === 'income' 
                            ? 'bg-success/20 text-success border border-success/30' 
                            : 'bg-destructive/20 text-destructive border border-destructive/30'
                        }`}>
                          {category.type.toUpperCase()}
                        </span>
                        <span className="text-xs md:text-sm text-muted-foreground font-medium truncate">
                          {category.transaction_count || 0} transactions
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
                    <div 
                      className="w-6 h-6 md:w-8 md:h-8 rounded-full border border-border/50 flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-[44px] min-w-[44px] p-2"
                      onClick={() => {
                        setEditingCategory(category);
                        setNewCategory({
                          name: category.name,
                          color: category.color,
                          type: category.type,
                          icon: category.icon || '📄'
                        });
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-[44px] min-w-[44px] p-2 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {filteredCategories.length === 0 && (
          <Card className="glass-card">
            <CardContent className="text-center py-12">
              <div className="text-4xl mb-4">📁</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No categories found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Try adjusting your search terms' : 'Create your first category to get started'}
              </p>
              <Button onClick={() => setIsDialogOpen(true)} className="text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}