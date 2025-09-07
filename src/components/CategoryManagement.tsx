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

interface Category {
  id: string;
  name: string;
  color: string;
  type: 'income' | 'expense';
  icon?: string;
  transaction_count?: number;
  user_id?: string;
}

const categoryIcons = [
  { name: 'Food', icon: '🍽️' },
  { name: 'Transport', icon: '🚗' },
  { name: 'Shopping', icon: '🛍️' },
  { name: 'Bills', icon: '📄' },
  { name: 'Entertainment', icon: '🎬' },
  { name: 'Health', icon: '🏥' },
  { name: 'Education', icon: '📚' },
  { name: 'Travel', icon: '✈️' },
  { name: 'Salary', icon: '💰' },
  { name: 'Business', icon: '💼' },
  { name: 'Investment', icon: '📈' },
  { name: 'Gift', icon: '🎁' },
];

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
      const categoryData = editingCategory 
        ? { 
            id: editingCategory.id,
            name: newCategory.name,
            color: newCategory.color,
            type: newCategory.type,
            user_id: editingCategory.user_id
          }
        : { 
            name: newCategory.name,
            color: newCategory.color,
            type: newCategory.type,
            user_id: user?.id!
          };

      const { error } = editingCategory
        ? await supabase
            .from('categories')
            .update({
              name: categoryData.name,
              color: categoryData.color,
              type: categoryData.type
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
      fetchCategories();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${editingCategory ? 'update' : 'create'} category`
      });
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

      // Insert default categories
      const defaultCategories = [
        { name: 'Food & Dining', color: '#FF6B6B', type: 'expense', user_id: user?.id },
        { name: 'Transportation', color: '#4ECDC4', type: 'expense', user_id: user?.id },
        { name: 'Shopping', color: '#45B7D1', type: 'expense', user_id: user?.id },
        { name: 'Bills & Utilities', color: '#96CEB4', type: 'expense', user_id: user?.id },
        { name: 'Entertainment', color: '#FFEAA7', type: 'expense', user_id: user?.id },
        { name: 'Salary', color: '#9ACD32', type: 'income', user_id: user?.id },
        { name: 'Business', color: '#DDA0DD', type: 'income', user_id: user?.id },
        { name: 'Investment', color: '#98D8C8', type: 'income', user_id: user?.id },
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
      <div className="glass-card rounded-none border-x-0 border-t-0 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/profile">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Category Management</h1>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
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
                  <Select value={newCategory.icon} onValueChange={(value) => 
                    setNewCategory(prev => ({ ...prev, icon: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryIcons.map((item) => (
                        <SelectItem key={item.name} value={item.icon}>
                          <div className="flex items-center space-x-2">
                            <span>{item.icon}</span>
                            <span>{item.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                
                <Button onClick={handleSaveCategory} className="w-full text-primary-foreground">
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="p-6 space-y-6 pb-24">
        {/* Search and Filter */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filterType} onValueChange={(value: 'all' | 'income' | 'expense') => setFilterType(value)}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={handleResetDefaults}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Categories List */}
        <div className="space-y-3">
          {filteredCategories.map((category) => (
            <Card key={category.id} className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      <span className="text-lg">{category.icon || '📄'}</span>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-foreground">{category.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          category.type === 'income' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                        }`}>
                          {category.type}
                        </span>
                        <span>{category.transaction_count || 0} transactions</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-6 h-6 rounded-full border border-border/50"
                      style={{ backgroundColor: category.color }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
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
                      onClick={() => handleDeleteCategory(category.id)}
                      className="text-destructive hover:text-destructive"
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