import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2, Lock } from 'lucide-react';

export default function AdminLogin() {
  const { adminUser, loading, signIn } = useAdminAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    totpCode: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (adminUser) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter both email and password"
      });
      return;
    }

    if (requires2FA && !formData.totpCode) {
      toast({
        variant: "destructive",
        title: "2FA Required",
        description: "Please enter your 2FA code"
      });
      return;
    }

    setIsSubmitting(true);
    
    const result = await signIn(formData.email, formData.password, formData.totpCode);
    
    if (result.success) {
      toast({
        title: "Welcome",
        description: "Successfully signed in to admin dashboard"
      });
    } else if (result.requires2fa) {
      setRequires2FA(true);
      toast({
        title: "2FA Required",
        description: "Please enter your authenticator code"
      });
    } else {
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: result.error || "Invalid credentials"
      });
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-destructive rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-destructive-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Admin Access</CardTitle>
          <CardDescription>
            Secure administrative portal
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Admin Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@company.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
                disabled={requires2FA}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter secure password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
                disabled={requires2FA}
              />
            </div>

            {requires2FA && (
              <div className="space-y-2">
                <Label htmlFor="totpCode">
                  <Lock className="h-4 w-4 inline mr-2" />
                  2FA Code
                </Label>
                <Input
                  id="totpCode"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={formData.totpCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, totpCode: e.target.value.replace(/\D/g, '') }))}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : requires2FA ? (
                'Verify 2FA Code'
              ) : (
                'Sign In'
              )}
            </Button>

            {requires2FA && (
              <Button 
                type="button" 
                variant="outline"
                className="w-full"
                onClick={() => {
                  setRequires2FA(false);
                  setFormData(prev => ({ ...prev, totpCode: '' }));
                }}
              >
                Back to Login
              </Button>
            )}
          </form>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Secured with enterprise-grade authentication</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}