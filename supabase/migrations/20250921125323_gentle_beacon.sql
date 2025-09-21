/*
  # Admin System Implementation

  1. New Tables
    - `admin_users` - Admin user management with security features
    - `admin_sessions` - Admin session tracking
    - `admin_audit_logs` - Comprehensive audit logging
    - `system_settings` - System configuration and feature flags
    - `admin_notifications` - Admin-to-user notifications
    - `user_analytics` - Aggregated user analytics (no PII)
    - `security_events` - Security monitoring and alerts

  2. Security Features
    - Role-based access control
    - Session management
    - Audit logging
    - IP allowlisting
    - Failed login tracking
    - Account lockout mechanisms

  3. Privacy Protection
    - No PII in analytics
    - Aggregated data only
    - Strict data separation
*/

-- Admin users table with enhanced security
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  is_active boolean DEFAULT true,
  requires_2fa boolean DEFAULT true,
  totp_secret text,
  backup_codes text[],
  allowed_ips inet[],
  failed_login_attempts integer DEFAULT 0,
  locked_until timestamptz,
  last_login timestamptz,
  last_password_change timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Admin sessions for tracking and security
CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES admin_users(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  ip_address inet,
  user_agent text,
  expires_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enhanced audit logging for admin actions
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  success boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- System settings and feature flags
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Admin notifications to users
CREATE TABLE IF NOT EXISTS app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
  target_audience text NOT NULL CHECK (target_audience IN ('all', 'users', 'admins')),
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Aggregated user analytics (no PII)
CREATE TABLE IF NOT EXISTS user_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  total_users integer DEFAULT 0,
  new_users integer DEFAULT 0,
  active_users integer DEFAULT 0,
  total_transactions integer DEFAULT 0,
  total_categories integer DEFAULT 0,
  geographic_data jsonb DEFAULT '{}',
  feature_usage jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Security events and monitoring
CREATE TABLE IF NOT EXISTS security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_user_id ON admin_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_user_id ON admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_user_analytics_date ON user_analytics(date);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);

-- RLS Policies
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Admin users can only see their own data
CREATE POLICY "Admin users can view own data" ON admin_users
  FOR SELECT USING (auth.jwt() ->> 'email' = email);

-- Admin sessions policies
CREATE POLICY "Admin can view own sessions" ON admin_sessions
  FOR SELECT USING (
    admin_user_id IN (
      SELECT id FROM admin_users WHERE email = auth.jwt() ->> 'email'
    )
  );

-- System settings - public settings visible to all, private to admins only
CREATE POLICY "Public read for public settings" ON system_settings
  FOR SELECT USING (is_public = true);

-- App notifications - users can read active notifications
CREATE POLICY "User read active notifications" ON app_notifications
  FOR SELECT USING (
    is_active = true 
    AND (target_audience = 'all' OR target_audience = 'users')
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admin_users_updated_at 
  BEFORE UPDATE ON admin_users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at 
  BEFORE UPDATE ON system_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_notifications_updated_at 
  BEFORE UPDATE ON app_notifications 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default system settings
INSERT INTO system_settings (key, value, description, is_public) VALUES
  ('maintenance_mode', 'false', 'Enable/disable maintenance mode', true),
  ('max_login_attempts', '3', 'Maximum failed login attempts before lockout', false),
  ('session_timeout_minutes', '60', 'Admin session timeout in minutes', false),
  ('require_2fa', 'true', 'Require 2FA for admin accounts', false),
  ('allowed_admin_ips', '[]', 'List of allowed IP addresses for admin access', false)
ON CONFLICT (key) DO NOTHING;