import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  Shield, 
  Database, 
  Bell, 
  Lock,
  Save,
  AlertTriangle,
  Info
} from 'lucide-react';

interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description: string | null;
  is_public: boolean;
}

export function AdminSystemSettings() {
  const { adminUser } = useAdminAuth();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('key');

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load system settings"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      setSaving(key);
      
      const { error } = await supabase
        .from('system_settings')
        .update({ value })
        .eq('key', key);

      if (error) throw error;

      // Update local state
      setSettings(prev => prev.map(setting => 
        setting.key === key ? { ...setting, value } : setting
      ));

      // Log the action
      await supabase
        .from('admin_audit_logs')
        .insert({
          admin_user_id: adminUser?.id,
          action: 'update_system_setting',
          resource_type: 'system_setting',
          resource_id: key,
          details: { key, value, previous_value: settings.find(s => s.key === key)?.value },
          success: true
        });

      toast({
        title: "Setting Updated",
        description: `${key.replace(/_/g, ' ')} has been updated successfully`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to update ${key.replace(/_/g, ' ')}`
      });
    } finally {
      setSaving(null);
    }
  };

  const getSetting = (key: string) => {
    return settings.find(s => s.key === key);
  };

  const getSettingValue = (key: string, defaultValue: any = '') => {
    const setting = getSetting(key);
    return setting ? setting.value : defaultValue;
  };

  const renderBooleanSetting = (key: string, label: string, description: string) => {
    const setting = getSetting(key);
    if (!setting) return null;

    return (
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-1">
          <Label className="text-sm font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Switch
          checked={setting.value === 'true' || setting.value === true}
          onCheckedChange={(checked) => updateSetting(key, checked.toString())}
          disabled={saving === key}
        />
      </div>
    );
  };

  const renderNumberSetting = (key: string, label: string, description: string, min?: number, max?: number) => {
    const setting = getSetting(key);
    if (!setting) return null;

    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
        <div className="flex items-center space-x-2">
          <Input
            type="number"
            value={setting.value}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (!isNaN(value) && (min === undefined || value >= min) && (max === undefined || value <= max)) {
                updateSetting(key, value.toString());
              }
            }}
            min={min}
            max={max}
            className="w-32"
            disabled={saving === key}
          />
          {saving === key && <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />}
        </div>
      </div>
    );
  };

  const renderTextSetting = (key: string, label: string, description: string, multiline = false) => {
    const setting = getSetting(key);
    if (!setting) return null;

    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
        <div className="flex items-start space-x-2">
          {multiline ? (
            <Textarea
              value={typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value)}
              onChange={(e) => updateSetting(key, e.target.value)}
              disabled={saving === key}
              rows={3}
            />
          ) : (
            <Input
              value={typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value)}
              onChange={(e) => updateSetting(key, e.target.value)}
              disabled={saving === key}
            />
          )}
          {saving === key && <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mt-2" />}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-4"></div>
          <div className="space-y-4">
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
        <h2 className="text-2xl font-bold">System Settings</h2>
        <Badge variant="outline">
          <Settings className="h-3 w-3 mr-1" />
          {settings.length} settings
        </Badge>
      </div>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Security Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderBooleanSetting(
            'require_2fa',
            'Require 2FA',
            'Require two-factor authentication for all admin accounts'
          )}
          
          {renderNumberSetting(
            'max_login_attempts',
            'Max Login Attempts',
            'Maximum failed login attempts before account lockout',
            1,
            10
          )}
          
          {renderNumberSetting(
            'session_timeout_minutes',
            'Session Timeout (minutes)',
            'Admin session timeout duration in minutes',
            5,
            480
          )}
          
          {renderTextSetting(
            'allowed_admin_ips',
            'Allowed Admin IPs',
            'JSON array of allowed IP addresses for admin access (empty array allows all)',
            true
          )}
        </CardContent>
      </Card>

      {/* Application Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Application Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderBooleanSetting(
            'maintenance_mode',
            'Maintenance Mode',
            'Enable maintenance mode to prevent user access during updates'
          )}
          
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Maintenance Mode Impact</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  When enabled, regular users will see a maintenance message and cannot access the application. 
                  Admin users can still access the admin dashboard.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notification Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-800">Notification System</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Notification settings are managed through the Notifications tab. 
                  This section will be expanded with additional notification preferences in future updates.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lock className="h-5 w-5" />
            <span>Advanced Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">Caution Required</h4>
                <p className="text-sm text-red-700 mt-1">
                  Advanced settings can significantly impact system behavior. 
                  Only modify these settings if you understand their implications.
                </p>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Additional advanced settings will be available in future updates. 
            Current settings provide essential security and operational controls.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}