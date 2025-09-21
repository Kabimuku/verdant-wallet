import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Lock, 
  Activity,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata: any;
  ip_address: string;
  resolved: boolean;
  created_at: string;
}

interface SecurityStats {
  totalEvents: number;
  criticalEvents: number;
  resolvedEvents: number;
  activeThreats: number;
}

export function AdminSecurityMonitor() {
  const { toast } = useToast();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState<SecurityStats>({
    totalEvents: 0,
    criticalEvents: 0,
    resolvedEvents: 0,
    activeThreats: 0
  });
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSecurityData();
    
    // Set up real-time monitoring
    const channel = supabase
      .channel('security-events')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'security_events'
        },
        () => {
          fetchSecurityData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [severityFilter]);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      
      // Fetch security events
      let query = supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }

      const { data: eventsData, error: eventsError } = await query;
      if (eventsError) throw eventsError;

      setEvents(eventsData || []);

      // Fetch statistics
      const { count: totalEvents } = await supabase
        .from('security_events')
        .select('*', { count: 'exact', head: true });

      const { count: criticalEvents } = await supabase
        .from('security_events')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'critical');

      const { count: resolvedEvents } = await supabase
        .from('security_events')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', true);

      const { count: activeThreats } = await supabase
        .from('security_events')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false)
        .in('severity', ['high', 'critical']);

      setStats({
        totalEvents: totalEvents || 0,
        criticalEvents: criticalEvents || 0,
        resolvedEvents: resolvedEvents || 0,
        activeThreats: activeThreats || 0
      });
    } catch (error) {
      console.error('Failed to fetch security data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load security data"
      });
    } finally {
      setLoading(false);
    }
  };

  const resolveEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('security_events')
        .update({ resolved: true })
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Event Resolved",
        description: "Security event has been marked as resolved"
      });

      fetchSecurityData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to resolve security event"
      });
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      low: 'default',
      medium: 'secondary',
      high: 'destructive',
      critical: 'destructive'
    };
    
    return (
      <Badge variant={variants[severity as keyof typeof variants] as any} className="capitalize">
        {severity}
      </Badge>
    );
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <Eye className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Security Monitor</h2>
        <div className="flex items-center space-x-4">
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchSecurityData} variant="outline">
            <Shield className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Security Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.criticalEvents}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Threats</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.activeThreats}</div>
            <p className="text-xs text-muted-foreground">Unresolved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolvedEvents}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalEvents > 0 ? Math.round((stats.resolvedEvents / stats.totalEvents) * 100) : 0}% resolution rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security Events List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Security Events</h3>
              <p className="text-muted-foreground">
                {severityFilter === 'all' 
                  ? 'No security events have been recorded'
                  : `No ${severityFilter} severity events found`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div 
                  key={event.id} 
                  className={`p-4 border rounded-lg ${
                    event.resolved ? 'bg-muted/30' : 'bg-background'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getSeverityIcon(event.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold text-sm">{event.event_type.replace(/_/g, ' ').toUpperCase()}</h4>
                          {getSeverityBadge(event.severity)}
                          {event.resolved && (
                            <Badge variant="outline" className="text-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Resolved
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDate(event.created_at)}
                          </span>
                          {event.ip_address && (
                            <span className="flex items-center">
                              <Lock className="h-3 w-3 mr-1" />
                              {event.ip_address}
                            </span>
                          )}
                        </div>
                        {event.metadata && Object.keys(event.metadata).length > 0 && (
                          <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(event.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {!event.resolved && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveEvent(event.id)}
                        className="ml-4"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}