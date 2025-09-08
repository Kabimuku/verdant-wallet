import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { User, Settings, BarChart3, ChevronRight } from 'lucide-react';

interface Profile {
  full_name: string;
  email: string;
}

interface Stats {
  totalTransactions: number;
  categoriesCount: number;
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<Profile>({ full_name: '', email: '' });
  const [stats, setStats] = useState<Stats>({
    totalTransactions: 0,
    categoriesCount: 0
  });
  const [loading, setLoading] = useState(true);

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
      // Get transaction count
      const { count: transactionCount, error: transactionError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      if (transactionError) throw transactionError;

      // Get categories count
      const { count: categoriesCount, error: categoriesError } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      if (categoriesError) throw categoriesError;

      setStats({
        totalTransactions: transactionCount || 0,
        categoriesCount: categoriesCount || 0
      });
    } catch (error: any) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
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
        {/* Action Cards */}
        <div className="space-y-4">
          {/* Transactions Card */}
          <Link to="/transactions">
            <Card className="glass-card hover:bg-card/90 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Transactions</h3>
                      <p className="text-sm text-muted-foreground">{stats.totalTransactions} total transactions</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Categories Card */}
          <Link to="/categories">
            <Card className="glass-card hover:bg-card/90 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                      <Settings className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Categories</h3>
                      <p className="text-sm text-muted-foreground">{stats.categoriesCount} categories created</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* App Settings Card */}
          <Link to="/settings">
            <Card className="glass-card hover:bg-card/90 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">App Settings</h3>
                      <p className="text-sm text-muted-foreground">Profile, preferences & security</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}