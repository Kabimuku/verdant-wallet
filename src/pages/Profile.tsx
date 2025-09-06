import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { User, LogOut, Settings, Wallet, BarChart3 } from 'lucide-react';

interface Profile {
  full_name: string;
  email: string;
}

interface Stats {
  totalTransactions: number;
  totalIncome: number;
  totalExpenses: number;
  categoriesCount: number;
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<Profile>({ full_name: '', email: '' });
  const [stats, setStats] = useState<Stats>({
    totalTransactions: 0,
    totalIncome: 0,
    totalExpenses: 0,
    categoriesCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchStats();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setProfile(data);
      } else {
        // If no profile exists, use user data
        setProfile({
          full_name: user?.user_metadata?.full_name || '',
          email: user?.email || ''
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load profile"
      });
    }
  };

  const fetchStats = async () => {
    try {
      // Get transaction stats
      const { data: transactions, error: transactionError } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', user?.id);

      if (transactionError) throw transactionError;

      // Get categories count
      const { count: categoriesCount, error: categoriesError } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      if (categoriesError) throw categoriesError;

      // Calculate stats
      const totalIncome = (transactions || [])
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const totalExpenses = (transactions || [])
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      setStats({
        totalTransactions: transactions?.length || 0,
        totalIncome,
        totalExpenses,
        categoriesCount: categoriesCount || 0
      });
    } catch (error: any) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user?.id,
          full_name: profile.full_name,
          email: profile.email
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed Out",
        description: "You have been signed out successfully"
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to sign out"
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-md mx-auto p-4">
          <div className="h-24 bg-muted rounded-lg"></div>
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-48 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-dark">
      {/* Header */}
      <div className="gradient-dark p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Avatar className="h-16 w-16 bg-primary">
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
              {getInitials(profile.full_name || profile.email)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{profile.full_name || 'User'}</h1>
            <p className="text-muted-foreground">{profile.email}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 pb-24">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Transactions</p>
                  <p className="text-xl font-bold text-foreground">{stats.totalTransactions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Categories</p>
                  <p className="text-xl font-bold text-foreground">{stats.categoriesCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Income/Expense Overview */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-foreground">
              <Wallet className="h-5 w-5" />
              <span>Financial Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-success/10 rounded-lg">
              <div>
                <p className="font-medium text-success">Total Income</p>
                <p className="text-sm text-muted-foreground">All time</p>
              </div>
              <p className="text-xl font-bold text-success">
                {formatCurrency(stats.totalIncome)}
              </p>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-destructive/10 rounded-lg">
              <div>
                <p className="font-medium text-destructive">Total Expenses</p>
                <p className="text-sm text-muted-foreground">All time</p>
              </div>
              <p className="text-xl font-bold text-destructive">
                {formatCurrency(stats.totalExpenses)}
              </p>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Net Balance</p>
                <p className="text-sm text-muted-foreground">Income - Expenses</p>
              </div>
              <p className={`text-xl font-bold ${
                stats.totalIncome - stats.totalExpenses >= 0 ? 'text-success' : 'text-destructive'
              }`}>
                {formatCurrency(stats.totalIncome - stats.totalExpenses)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-foreground">
              <User className="h-5 w-5" />
              <span>Profile Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={profile.full_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter your full name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email"
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed from here
                </p>
              </div>
              
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? 'Saving...' : 'Update Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <Button 
              variant="destructive" 
              onClick={handleSignOut}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}