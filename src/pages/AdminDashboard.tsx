import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Activity, 
  TrendingUp, 
  Shield, 
  Settings, 
  Bell, 
  AlertTriangle,
  Server,
  Database,
  Lock,
  Eye,
  LogOut
} from 'lucide-react';
import { AdminUserAnalytics } from '@/components/admin/AdminUserAnalytics';
import { AdminSystemHealth } from '@/components/admin/AdminSystemHealth';
import { AdminSecurityMonitor } from '@/components/admin/AdminSecurityMonitor';
import { AdminNotifications } from '@/components/admin/AdminNotifications';
import { AdminAuditLogs } from '@/components/admin/AdminAuditLogs';
import { AdminSystemSettings } from '@/components/admin/AdminSystemSettings';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  totalTransactions: number;
  securityAlerts: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

export default function AdminDashboard() {
  const { adminUser, signOut } = useAdminAuth();
  const { toast } = useToast();
  
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    totalTransactions: 0,
    securityAlerts: 0,
    systemHealth: 'healthy'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
    
    // Set up real-time updates
    const interval = setInterval(fetchDashboardStats, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Get total users (count only, no PII)
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get users created today
      const today = new Date().toISOString().split('T')[0];
      const { count: newUsersToday } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      // Get total transactions (count only)
      const { count: totalTransactions } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });

      // Get unresolved security alerts
      const { count: securityAlerts } = await supabase
        .from('security_events')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false)
        .in('severity', ['high', 'critical']);

      // Calculate active users (users with transactions in last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: activeUserIds } = await supabase
        .from('transactions')
        .select('user_id')
        .gte('created_at', sevenDaysAgo);

      const activeUsers = new Set(activeUserIds?.map(t => t.user_id) || []).size;

      // Determine system health
      let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (securityAlerts && securityAlerts > 0) {
        systemHealth = securityAlerts > 5 ? 'critical' : 'warning';
      }

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers,
        newUsersToday: newUsersToday || 0,
        totalTransactions: totalTransactions || 0,
        securityAlerts: securityAlerts || 0,
        systemHealth
      });
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load dashboard statistics"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed Out",
      description: "You have been securely signed out"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-4xl mx-auto p-4">
          <div className="h-8 bg-muted rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-destructive rounded-full flex items-center justify-center">
                <Shield className="h-6 w-6 text-destructive-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {adminUser?.email}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant={stats.systemHealth === 'healthy' ? 'default' : 'destructive'}>
                <Server className="h-3 w-3 mr-1" />
                System {stats.systemHealth}
              </Badge>
              
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.newUsersToday} today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Last 7 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTransactions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                All time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.securityAlerts}</div>
              <p className="text-xs text-muted-foreground">
                Unresolved
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="analytics">
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="health">
              <Server className="h-4 w-4 mr-2" />
              System Health
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="audit">
              <Eye className="h-4 w-4 mr-2" />
              Audit Logs
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <AdminUserAnalytics />
          </TabsContent>

          <TabsContent value="health">
            <AdminSystemHealth />
          </TabsContent>

          <TabsContent value="security">
            <AdminSecurityMonitor />
          </TabsContent>

          <TabsContent value="notifications">
            <AdminNotifications />
          </TabsContent>

          <TabsContent value="audit">
            <AdminAuditLogs />
          </TabsContent>

          <TabsContent value="settings">
            <AdminSystemSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}