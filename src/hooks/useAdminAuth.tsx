import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminUser {
  id: string;
  email: string;
  is_active: boolean;
  requires_2fa: boolean;
  last_login: string | null;
}

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  loading: boolean;
  signIn: (email: string, password: string, totpCode?: string) => Promise<{ success: boolean; requires2fa?: boolean; error?: string }>;
  signOut: () => Promise<void>;
  verifySession: () => Promise<boolean>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkAdminSession();
  }, []);

  const checkAdminSession = async () => {
    try {
      const sessionToken = localStorage.getItem('admin_session_token');
      if (!sessionToken) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('admin_sessions')
        .select(`
          admin_user_id,
          expires_at,
          admin_users (
            id,
            email,
            is_active,
            requires_2fa,
            last_login
          )
        `)
        .eq('session_token', sessionToken)
        .eq('is_active', true)
        .single();

      if (error || !data || new Date(data.expires_at) < new Date()) {
        localStorage.removeItem('admin_session_token');
        setLoading(false);
        return;
      }

      setAdminUser(data.admin_users as AdminUser);
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string, totpCode?: string) => {
    try {
      // Check if user exists and is active
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (adminError || !adminData) {
        await logSecurityEvent('failed_admin_login', 'medium', `Failed login attempt for ${email}`, { email });
        return { success: false, error: 'Invalid credentials' };
      }

      // Check if account is locked
      if (adminData.locked_until && new Date(adminData.locked_until) > new Date()) {
        await logSecurityEvent('locked_account_access', 'high', `Access attempt on locked account: ${email}`, { email });
        return { success: false, error: 'Account is temporarily locked' };
      }

      // Verify password (in production, use proper password hashing)
      const isValidPassword = await verifyPassword(password, adminData.password_hash);
      if (!isValidPassword) {
        await incrementFailedAttempts(adminData.id);
        await logSecurityEvent('failed_admin_login', 'medium', `Invalid password for ${email}`, { email });
        return { success: false, error: 'Invalid credentials' };
      }

      // Check 2FA if required
      if (adminData.requires_2fa && !totpCode) {
        return { success: false, requires2fa: true };
      }

      if (adminData.requires_2fa && totpCode) {
        const isValid2FA = await verify2FA(adminData.totp_secret, totpCode);
        if (!isValid2FA) {
          await logSecurityEvent('failed_2fa', 'high', `Invalid 2FA code for ${email}`, { email });
          return { success: false, error: 'Invalid 2FA code' };
        }
      }

      // Create session
      const sessionToken = generateSecureToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      const { error: sessionError } = await supabase
        .from('admin_sessions')
        .insert({
          admin_user_id: adminData.id,
          session_token: sessionToken,
          ip_address: await getClientIP(),
          user_agent: navigator.userAgent,
          expires_at: expiresAt.toISOString()
        });

      if (sessionError) {
        return { success: false, error: 'Failed to create session' };
      }

      // Reset failed attempts and update last login
      await supabase
        .from('admin_users')
        .update({
          failed_login_attempts: 0,
          locked_until: null,
          last_login: new Date().toISOString()
        })
        .eq('id', adminData.id);

      // Log successful login
      await logAuditEvent(adminData.id, 'admin_login', 'admin_session', sessionToken, { success: true });

      localStorage.setItem('admin_session_token', sessionToken);
      setAdminUser({
        id: adminData.id,
        email: adminData.email,
        is_active: adminData.is_active,
        requires_2fa: adminData.requires_2fa,
        last_login: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Admin sign in error:', error);
      return { success: false, error: 'Sign in failed' };
    }
  };

  const signOut = async () => {
    try {
      const sessionToken = localStorage.getItem('admin_session_token');
      if (sessionToken && adminUser) {
        // Deactivate session
        await supabase
          .from('admin_sessions')
          .update({ is_active: false })
          .eq('session_token', sessionToken);

        // Log logout
        await logAuditEvent(adminUser.id, 'admin_logout', 'admin_session', sessionToken, { success: true });
      }

      localStorage.removeItem('admin_session_token');
      setAdminUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const verifySession = async (): Promise<boolean> => {
    const sessionToken = localStorage.getItem('admin_session_token');
    if (!sessionToken) return false;

    try {
      const { data, error } = await supabase
        .from('admin_sessions')
        .select('expires_at, is_active')
        .eq('session_token', sessionToken)
        .single();

      if (error || !data || !data.is_active || new Date(data.expires_at) < new Date()) {
        await signOut();
        return false;
      }

      return true;
    } catch (error) {
      await signOut();
      return false;
    }
  };

  return (
    <AdminAuthContext.Provider value={{
      adminUser,
      loading,
      signIn,
      signOut,
      verifySession
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}

// Helper functions
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // In production, use bcrypt or similar
  // This is a simplified version for demo
  return password === hash; // Replace with proper hash verification
}

async function verify2FA(secret: string, code: string): Promise<boolean> {
  // In production, use a proper TOTP library
  // This is a simplified version for demo
  return code.length === 6; // Replace with proper TOTP verification
}

function generateSecureToken(): string {
  return crypto.randomUUID() + '-' + Date.now();
}

async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return '0.0.0.0';
  }
}

async function incrementFailedAttempts(adminId: string) {
  const { data } = await supabase
    .from('admin_users')
    .select('failed_login_attempts')
    .eq('id', adminId)
    .single();

  const attempts = (data?.failed_login_attempts || 0) + 1;
  const lockUntil = attempts >= 3 ? new Date(Date.now() + 30 * 60 * 1000) : null; // 30 min lock

  await supabase
    .from('admin_users')
    .update({
      failed_login_attempts: attempts,
      locked_until: lockUntil?.toISOString()
    })
    .eq('id', adminId);
}

async function logAuditEvent(adminId: string, action: string, resourceType: string, resourceId: string, details: any) {
  await supabase
    .from('admin_audit_logs')
    .insert({
      admin_user_id: adminId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      ip_address: await getClientIP(),
      user_agent: navigator.userAgent
    });
}

async function logSecurityEvent(eventType: string, severity: string, description: string, metadata: any) {
  await supabase
    .from('security_events')
    .insert({
      event_type: eventType,
      severity,
      description,
      metadata,
      ip_address: await getClientIP(),
      user_agent: navigator.userAgent
    });
}