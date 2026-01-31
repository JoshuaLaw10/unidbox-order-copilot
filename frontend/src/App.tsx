import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AdminGuard } from "./components/RouteGuard";
import Home from "./pages/Home";
import PublicCatalog from "./pages/PublicCatalog";
import PublicOrder from "./pages/PublicOrder";
import PublicOrderConfirmation from "./pages/PublicOrderConfirmation";
import TrackOrder from "./pages/TrackOrder";
import StaffLogin from "./pages/StaffLogin";
import Unauthorized from "./pages/Unauthorized";
import InquiryDetail from "./pages/InquiryDetail";
import OrderDetail from "./pages/OrderDetail";
import AdminDashboard from "./pages/AdminDashboard";

function Router() {
  return (
    <Switch>
      {/* Public routes - no login required */}
      <Route path="/" component={Home} />
      <Route path="/catalog" component={PublicCatalog} />
      <Route path="/order" component={PublicOrder} />
      <Route path="/order/confirmation" component={PublicOrderConfirmation} />
      <Route path="/track-order" component={TrackOrder} />
      <Route path="/assistant" component={PublicCatalog} />
      
      {/* Staff login */}
      <Route path="/staff/login" component={StaffLogin} />
      <Route path="/unauthorized" component={Unauthorized} />
      
      {/* Inquiry and Order detail pages - accessible to all */}
      <Route path="/inquiry/:id" component={InquiryDetail} />
      <Route path="/order/:id" component={OrderDetail} />
      
      {/* Admin routes - protected (staff only) */}
      <Route path="/admin">
        <AdminGuard>
          <AdminDashboard />
        </AdminGuard>
      </Route>
      <Route path="/admin/products">
        <AdminGuard>
          <AdminDashboard />
        </AdminGuard>
      </Route>
      <Route path="/admin/inquiries">
        <AdminGuard>
          <AdminDashboard />
        </AdminGuard>
      </Route>
      <Route path="/admin/orders">
        <AdminGuard>
          <AdminDashboard />
        </AdminGuard>
      </Route>
      <Route path="/admin/do-history">
        <AdminGuard>
          <AdminDashboard />
        </AdminGuard>
      </Route>
      
      {/* 404 */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
