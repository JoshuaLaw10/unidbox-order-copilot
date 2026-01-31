import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface RouteGuardProps {
  children: ReactNode;
  allowedRoles?: ('admin' | 'dealer' | 'user')[];
  requireAuth?: boolean;
}

export function RouteGuard({ children, allowedRoles, requireAuth = true }: RouteGuardProps) {
  const [, setLocation] = useLocation();
  const { user, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (requireAuth && !isAuthenticated) {
      setLocation("/staff/login");
      return;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role as any)) {
      setLocation("/unauthorized");
      return;
    }
  }, [loading, isAuthenticated, user, allowedRoles, requireAuth, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return null;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role as any)) {
    return null;
  }

  return <>{children}</>;
}

// Specific guards for convenience
export function AdminGuard({ children }: { children: ReactNode }) {
  return (
    <RouteGuard allowedRoles={['admin']}>
      {children}
    </RouteGuard>
  );
}

export function DealerGuard({ children }: { children: ReactNode }) {
  return (
    <RouteGuard allowedRoles={['dealer']}>
      {children}
    </RouteGuard>
  );
}

export function AuthGuard({ children }: { children: ReactNode }) {
  return (
    <RouteGuard requireAuth={true}>
      {children}
    </RouteGuard>
  );
}
