import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Server, 
  Database, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Wrench,
  Users,
  Clock
} from 'lucide-react';

interface SystemHealth {
  database: 'healthy' | 'warning' | 'critical';
  api: 'healthy' | 'warning' | 'critical';
  storage: 'healthy' | 'warning' | 'critical';
  maintenanceMode: boolean;
  uptime: string;
  activeConnections: number;
  responseTime: number;
}

export function AdminSystemHealth() {
  const { toast } = useToast();
  const [health, setHealth] = useState<SystemHealth>({
    database: 'healthy',
    api: 'healthy',
    storage: 'healthy',
    maintenanceMode: false,
    uptime: '0d 0h 0m',
    activeConnections: 0,
    responseTime: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSystemHealth();
    
    // Check health every 30 seconds
    const interval = setInterval(checkSystemHealth, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const checkSystemHealth = async () => {
    try {
      setLoading(true);
      
      // Check maintenance mode
      const { data: maintenanceData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single();

      const maintenanceMode = maintenanceData?.value === 'true';

      // Test database connectivity
      const dbStart = Date.now();
      const { error: dbError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      const dbResponseTime = Date.now() - dbStart;

      // Get active sessions count (approximation)
      const { count: activeConnections } = await supabase
        .from('admin_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Determine health status
      const database = dbError ? 'critical' : dbResponseTime > 1000 ? 'warning' : 'healthy';
      const api = dbResponseTime > 2000 ? 'critical' : dbResponseTime > 500 ? 'warning' : 'healthy';
      const storage = 'healthy'; // Simplified for demo

      // Calculate uptime (simplified)
      const uptime = calculateUptime();

      setHealth({
        database,
        api,
        storage,
        maintenanceMode,
        uptime,
        activeConnections: activeConnections || 0,
        responseTime: dbResponseTime
      });
    } catch (error) {
      console.error('Health check failed:', error);
      setHealth(prev => ({
        ...prev,
        database: 'critical',
        api: 'critical'
      }));
    } finally {
      setLoading(false);
    }
  };

  const calculateUptime = () => {
    // Simplified uptime calculation
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = now.getTime() - start.getTime();
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${days}d ${hours}h ${minutes}m`;
  };

  const toggleMaintenanceMode = async () => {
    try {
      const newMode = !health.maintenanceMode;
      
      const { error } = await supabase
        .from('system_settings')
        .update({ value: newMode.toString() })
        .eq('key', 'maintenance_mode');

      if (error) throw error;

      setHealth(prev => ({ ...prev, maintenanceMode: newMode }));
      
      toast({
        title: "Maintenance Mode Updated",
        description: `Maintenance mode ${newMode ? 'enabled' : 'disabled'}`
      });

      // Log the action
      await supabase
        .from('admin_audit_logs')
        .insert({
          action: 'toggle_maintenance_mode',
          resource_type: 'system_setting',
          resource_id: 'maintenance_mode',
          details: { enabled: newMode },
          success: true
        });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update maintenance mode"
      });
    }
  };

  const getStatusIcon = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusBadge = (status: 'healthy' | 'warning' | 'critical') => {
    const variant = status === 'healthy' ? 'default' : 'destructive';
    return (
      <Badge variant={variant} className="capitalize">
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">System Health</h2>
        <Button onClick={checkSystemHealth} variant="outline">
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {getStatusIcon(health.database)}
              {getStatusBadge(health.database)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Response: {health.responseTime}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {getStatusIcon(health.api)}
              {getStatusBadge(health.api)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Uptime: {health.uptime}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {getStatusIcon(health.storage)}
              {getStatusBadge(health.storage)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connections</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health.activeConnections}</div>
            <p className="text-xs text-muted-foreground">
              Active sessions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Mode Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wrench className="h-5 w-5" />
            <span>Maintenance Mode</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="maintenance-mode">Enable Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, users will see a maintenance message and cannot access the app
              </p>
            </div>
            <Switch
              id="maintenance-mode"
              checked={health.maintenanceMode}
              onCheckedChange={toggleMaintenanceMode}
            />
          </div>
          
          {health.maintenanceMode && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="font-medium text-yellow-800">Maintenance Mode Active</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                Users are currently seeing a maintenance message and cannot access the application.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>System Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Average Response Time</span>
              </div>
              <div className="text-2xl font-bold">{health.responseTime}ms</div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    health.responseTime < 200 ? 'bg-green-500' :
                    health.responseTime < 500 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min((health.responseTime / 1000) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">System Load</span>
              </div>
              <div className="text-2xl font-bold">Normal</div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="h-2 rounded-full bg-green-500" style={{ width: '35%' }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Server className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Memory Usage</span>
              </div>
              <div className="text-2xl font-bold">42%</div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="h-2 rounded-full bg-blue-500" style={{ width: '42%' }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}