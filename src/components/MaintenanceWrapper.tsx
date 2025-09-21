import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MaintenanceMode } from '@/components/MaintenanceMode';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface MaintenanceWrapperProps {
  children: React.ReactNode;
}

export function MaintenanceWrapper({ children }: MaintenanceWrapperProps) {
  const { adminUser } = useAdminAuth();
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkMaintenanceMode();
    
    // Set up real-time subscription for maintenance mode changes
    const channel = supabase
      .channel('maintenance-mode')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_settings',
          filter: 'key=eq.maintenance_mode'
        },
        (payload) => {
          setIsMaintenanceMode(payload.new.value === 'true');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkMaintenanceMode = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single();

      if (error) {
        console.error('Failed to check maintenance mode:', error);
        setIsMaintenanceMode(false);
      } else {
        setIsMaintenanceMode(data.value === 'true');
      }
    } catch (error) {
      console.error('Maintenance mode check failed:', error);
      setIsMaintenanceMode(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Show maintenance mode to regular users, but allow admin access
  if (isMaintenanceMode && !adminUser) {
    return <MaintenanceMode />;
  }

  return <>{children}</>;
}