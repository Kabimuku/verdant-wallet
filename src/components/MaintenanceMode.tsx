import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Wrench, Clock, Shield } from 'lucide-react';

export function MaintenanceMode() {
  const [estimatedTime, setEstimatedTime] = useState('');

  useEffect(() => {
    // Check for estimated maintenance time from system settings
    const fetchMaintenanceInfo = async () => {
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'maintenance_estimated_time')
          .single();
        
        if (data?.value) {
          setEstimatedTime(data.value);
        }
      } catch (error) {
        // Ignore errors for maintenance info
      }
    };

    fetchMaintenanceInfo();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <Wrench className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Under Maintenance</CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            We're currently performing scheduled maintenance to improve your experience. 
            The application will be back online shortly.
          </p>
          
          {estimatedTime && (
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Estimated completion: {estimatedTime}</span>
            </div>
          )}
          
          <div className="pt-4 border-t">
            <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span>Your data is safe and secure</span>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground">
            Thank you for your patience. Please check back in a few minutes.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}