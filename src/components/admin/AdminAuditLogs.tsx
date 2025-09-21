import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Eye, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Activity,
  CheckCircle,
  XCircle,
  Lock
} from 'lucide-react';

interface AuditLog {
  id: string;
  admin_user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  created_at: string;
  admin_users?: {
    email: string;
  };
}

export function AdminAuditLogs() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [successFilter, setSuccessFilter] = useState('all');

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, actionFilter, successFilter]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select(`
          *,
          admin_users (
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load audit logs"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = logs;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resource_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.admin_users?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ip_address?.includes(searchTerm)
      );
    }

    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    // Success filter
    if (successFilter !== 'all') {
      filtered = filtered.filter(log => 
        successFilter === 'success' ? log.success : !log.success
      );
    }

    setFilteredLogs(filtered);
  };

  const getUniqueActions = () => {
    const actions = [...new Set(logs.map(log => log.action))];
    return actions.sort();
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getActionIcon = (action: string) => {
    if (action.includes('login') || action.includes('logout')) {
      return <Lock className="h-4 w-4 text-blue-500" />;
    }
    if (action.includes('create') || action.includes('add')) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (action.includes('delete') || action.includes('remove')) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-4"></div>
          <div className="h-16 bg-muted rounded-lg mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Audit Logs</h2>
        <Badge variant="outline">
          {filteredLogs.length} of {logs.length} logs
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {getUniqueActions().map(action => (
                  <SelectItem key={action} value={action}>
                    {formatAction(action)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={successFilter} onValueChange={setSuccessFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success Only</SelectItem>
                <SelectItem value="failure">Failures Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs List */}
      <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Audit Logs</h3>
              <p className="text-muted-foreground">
                {searchTerm || actionFilter !== 'all' || successFilter !== 'all'
                  ? 'No logs match your current filters'
                  : 'No audit logs have been recorded yet'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredLogs.map((log) => (
            <Card key={log.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getActionIcon(log.action)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-sm">{formatAction(log.action)}</h4>
                        <Badge variant={log.success ? 'default' : 'destructive'}>
                          {log.success ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {log.success ? 'Success' : 'Failed'}
                        </Badge>
                        {log.resource_type && (
                          <Badge variant="outline" className="capitalize">
                            {log.resource_type.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <User className="h-3 w-3 mr-2" />
                            <span>{log.admin_users?.email || 'System'}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-2" />
                            <span>{formatDate(log.created_at)}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          {log.ip_address && (
                            <div className="flex items-center">
                              <Lock className="h-3 w-3 mr-2" />
                              <span>{log.ip_address}</span>
                            </div>
                          )}
                          {log.resource_id && (
                            <div className="flex items-center">
                              <Activity className="h-3 w-3 mr-2" />
                              <span className="truncate">ID: {log.resource_id}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                          <h5 className="text-xs font-medium text-muted-foreground mb-2">Details:</h5>
                          <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}

                      {log.user_agent && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          <span className="font-medium">User Agent:</span> {log.user_agent}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}