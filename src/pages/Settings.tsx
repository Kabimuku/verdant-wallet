import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { User, Bell, Download, Shield, LogOut, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Profile {
  full_name: string;
  email: string;
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<Profile>({ full_name: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setProfile(data);
      } else {
        setProfile({
          full_name: user?.user_metadata?.full_name || '',
          email: user?.email || ''
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load profile"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user?.id,
          full_name: profile.full_name,
          email: profile.email
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed Out",
        description: "You have been signed out successfully"
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to sign out"
      });
    }
  };

  const handleExportData = async () => {
    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
          *,
          categories (name, color)
        `)
        .eq('user_id', user?.id);

      if (error) throw error;

      const dataStr = JSON.stringify(transactions, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `money-tracker-data-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Data exported successfully"
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to export data"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-md mx-auto p-4">
          <div className="h-24 bg-muted rounded-lg"></div>
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-48 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-dark">
      {/* Header */}
      <div className="glass-card rounded-none border-x-0 border-t-0 p-6">
        <div className="flex items-center space-x-4">
          <Link to="/profile">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        </div>
      </div>

      <div className="p-6 space-y-6 pb-24">
        {/* Profile Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-foreground">
              <User className="h-5 w-5" />
              <span>Profile Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={profile.full_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter your full name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed from here
                </p>
              </div>
              
              <Button type="submit" disabled={saving} className="w-full text-primary-foreground">
                {saving ? 'Saving...' : 'Update Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* App Preferences */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-foreground">
              <Bell className="h-5 w-5" />
              <span>App Preferences</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
              <div>
                <p className="font-medium text-foreground">Theme</p>
                <p className="text-sm text-muted-foreground">Dark mode (default)</p>
              </div>
              <div className="text-primary">Dark</div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
              <div>
                <p className="font-medium text-foreground">Currency</p>
                <p className="text-sm text-muted-foreground">Indian Rupee</p>
              </div>
              <div className="text-primary">₹ INR</div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
              <div>
                <p className="font-medium text-foreground">Notifications</p>
                <p className="text-sm text-muted-foreground">Transaction reminders</p>
              </div>
              <div className="text-success">Enabled</div>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-foreground">
              <Download className="h-5 w-5" />
              <span>Data Management</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleExportData}
              variant="outline" 
              className="w-full justify-start"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Transaction Data
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              disabled
            >
              Backup to Cloud (Coming Soon)
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              disabled
            >
              Restore from Backup (Coming Soon)
            </Button>
          </CardContent>
        </Card>

        {/* Account Options */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-foreground">
              <Shield className="h-5 w-5" />
              <span>Account</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              disabled
            >
              Change Password
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              disabled
            >
              Security Settings
            </Button>
            
            <Separator />
            
            <Button 
              variant="destructive" 
              onClick={handleSignOut}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}