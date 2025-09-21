import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Users, TrendingUp, Activity, Calendar } from 'lucide-react';

interface AnalyticsData {
  date: string;
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  totalTransactions: number;
}

export function AdminUserAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      // Generate date range
      const dateRange = Array.from({ length: days }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        return date.toISOString().split('T')[0];
      });

      const analyticsPromises = dateRange.map(async (date) => {
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        // Get new users for this date
        const { count: newUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', date)
          .lt('created_at', nextDate.toISOString().split('T')[0]);

        // Get total users up to this date
        const { count: totalUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .lte('created_at', nextDate.toISOString().split('T')[0]);

        // Get active users (users with transactions on this date)
        const { data: activeUserIds } = await supabase
          .from('transactions')
          .select('user_id')
          .gte('created_at', date)
          .lt('created_at', nextDate.toISOString().split('T')[0]);

        const activeUsers = new Set(activeUserIds?.map(t => t.user_id) || []).size;

        // Get total transactions for this date
        const { count: totalTransactions } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', date)
          .lt('created_at', nextDate.toISOString().split('T')[0]);

        return {
          date,
          totalUsers: totalUsers || 0,
          newUsers: newUsers || 0,
          activeUsers,
          totalTransactions: totalTransactions || 0
        };
      });

      const data = await Promise.all(analyticsPromises);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const latestData = analyticsData[analyticsData.length - 1];
  const previousData = analyticsData[analyticsData.length - 2];

  const calculateGrowth = (current: number, previous: number) => {
    if (!previous) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
          <div className="h-80 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">User Analytics</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 days</SelectItem>
            <SelectItem value="30d">30 days</SelectItem>
            <SelectItem value="90d">90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestData?.totalUsers.toLocaleString() || 0}</div>
            {previousData && (
              <p className="text-xs text-muted-foreground">
                +{calculateGrowth(latestData?.totalUsers || 0, previousData.totalUsers)}% from yesterday
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestData?.activeUsers.toLocaleString() || 0}</div>
            {previousData && (
              <p className="text-xs text-muted-foreground">
                +{calculateGrowth(latestData?.activeUsers || 0, previousData.activeUsers)}% from yesterday
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestData?.totalTransactions.toLocaleString() || 0}</div>
            {previousData && (
              <p className="text-xs text-muted-foreground">
                +{calculateGrowth(latestData?.totalTransactions || 0, previousData.totalTransactions)}% from yesterday
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle>User Growth Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  labelFormatter={(value) => formatDate(value as string)}
                  formatter={(value: number, name: string) => [
                    value.toLocaleString(),
                    name === 'totalUsers' ? 'Total Users' :
                    name === 'newUsers' ? 'New Users' :
                    name === 'activeUsers' ? 'Active Users' : name
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="totalUsers" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="totalUsers"
                />
                <Line 
                  type="monotone" 
                  dataKey="newUsers" 
                  stroke="hsl(var(--success))" 
                  strokeWidth={2}
                  name="newUsers"
                />
                <Line 
                  type="monotone" 
                  dataKey="activeUsers" 
                  stroke="hsl(var(--warning))" 
                  strokeWidth={2}
                  name="activeUsers"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Transaction Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  labelFormatter={(value) => formatDate(value as string)}
                  formatter={(value: number) => [value.toLocaleString(), 'Transactions']}
                />
                <Bar 
                  dataKey="totalTransactions" 
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}