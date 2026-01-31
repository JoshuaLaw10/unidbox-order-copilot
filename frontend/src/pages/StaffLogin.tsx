import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Package, Loader2, AlertCircle, Eye, EyeOff, ShieldCheck, ArrowLeft } from "lucide-react";

export default function StaffLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const loginMutation = trpc.auth.staffLogin.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setLocation("/admin");
      }
    },
    onError: (err) => {
      setError(err.message || "Login failed. Please check your credentials.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-semibold text-white">UnidBox</span>
              <span className="text-[10px] text-slate-400 -mt-1">AutoFlow</span>
            </div>
          </a>
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/")}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Catalog
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-2xl border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardHeader className="space-y-1 text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Staff Portal Login</CardTitle>
            <CardDescription className="text-slate-400">
              For UnidBox staff only. Dealers do not need an account.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="bg-red-900/50 border-red-800 text-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Staff Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="staff@unidbox.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-amber-500"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-amber-500"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Sign In to Staff Portal
                  </>
                )}
              </Button>
            </form>

            {/* Demo Account Info */}
            <div className="mt-6 pt-6 border-t border-slate-700">
              <p className="text-sm text-slate-500 text-center mb-3">Demo Staff Account</p>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <p className="font-medium text-slate-300 mb-1">Admin Account</p>
                <p className="text-sm text-slate-400">admin@demo.com</p>
                <p className="text-sm text-slate-400">admin123</p>
              </div>
            </div>

            {/* Notice */}
            <div className="mt-4 p-3 bg-blue-900/30 border border-blue-800/50 rounded-lg">
              <p className="text-xs text-blue-300 text-center">
                <strong>Note:</strong> Dealers can place orders directly from the{" "}
                <a href="/" className="underline hover:text-blue-200">public catalog</a>{" "}
                without needing to log in.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-sm text-slate-500">
        <p>UnidBox Staff Portal • Internal Use Only</p>
      </footer>
    </div>
  );
}
