import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Package,
  FileText,
  ShoppingCart,
  Search,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  RefreshCw,
  Home,
  FileBox,
  Edit2,
  Save,
  X,
  DollarSign,
  Boxes,
  Truck,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import { toast } from "sonner";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: Package, label: "Products", path: "/admin/products" },
  { icon: FileText, label: "Inquiries", path: "/admin/inquiries" },
  { icon: ShoppingCart, label: "Orders", path: "/admin/orders" },
  { icon: FileBox, label: "DO History", path: "/admin/do-history" },
];

const SIDEBAR_WIDTH_KEY = "admin-sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function AdminDashboard() {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-elegant-lg">
            <Package className="w-8 h-8 text-white" />
          </div>
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Admin Access Required
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Sign in with an admin account to access the dashboard.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access the admin dashboard.
            </p>
            <Button onClick={() => (window.location.href = "/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <AdminDashboardContent setSidebarWidth={setSidebarWidth} />
    </SidebarProvider>
  );
}

type AdminDashboardContentProps = {
  setSidebarWidth: (width: number) => void;
};

function AdminDashboardContent({ setSidebarWidth }: AdminDashboardContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find((item) => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  // Determine which content to show based on location
  const renderContent = () => {
    if (location === "/admin/products") {
      return <ProductsTab />;
    }
    if (location === "/admin/inquiries") {
      return <InquiriesTab />;
    }
    if (location === "/admin/orders") {
      return <OrdersTab />;
    }
    if (location === "/admin/do-history") {
      return <DOHistoryTab />;
    }
    return <DashboardOverview />;
  };

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                    <Package className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold tracking-tight truncate">UnidBox</span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map((item) => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal`}
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>

            <div className="mt-auto px-2 py-1">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLocation("/")}
                    tooltip="Back to Home"
                    className="h-10"
                  >
                    <Home className="h-4 w-4" />
                    <span>Back to Home</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </div>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${
            isCollapsed ? "hidden" : ""
          }`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <span className="tracking-tight text-foreground">
                  {activeMenuItem?.label ?? "Dashboard"}
                </span>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-6">{renderContent()}</main>
      </SidebarInset>
    </>
  );
}

// Dashboard Overview Component
function DashboardOverview() {
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Inquiries",
      value: stats?.totalInquiries || 0,
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      title: "Total Orders",
      value: stats?.totalOrders || 0,
      icon: ShoppingCart,
      color: "text-green-600",
      bg: "bg-green-100",
    },
    {
      title: "Pending Inquiries",
      value: stats?.pendingInquiries || 0,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
    {
      title: "Pending Orders",
      value: stats?.pendingOrders || 0,
      icon: AlertCircle,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Monitor your wholesale order automation system
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="shadow-elegant border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats?.totalRevenue !== undefined && stats.totalRevenue > 0 && (
        <Card className="shadow-elegant border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Revenue from Confirmed Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-green-600">
              ${Number(stats.totalRevenue).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Inquiries Tab Component
function InquiriesTab() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: inquiries, isLoading, refetch } = trpc.inquiries.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    search: search || undefined,
  });

  const updateStatus = trpc.inquiries.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      refetch();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inquiries</h1>
          <p className="text-muted-foreground">Manage dealer inquiries</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card className="shadow-elegant border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search inquiries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="parsed">Parsed</SelectItem>
                <SelectItem value="quoted">Quoted</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : inquiries && inquiries.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">ID</th>
                    <th className="px-4 py-3 text-left font-medium">Dealer</th>
                    <th className="px-4 py-3 text-left font-medium">Inquiry</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {inquiries.map((inquiry) => (
                    <tr key={inquiry.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">#{inquiry.id}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{inquiry.dealerName || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">
                            {inquiry.dealerEmail || "-"}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="truncate text-muted-foreground">
                          {inquiry.rawInquiry}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium status-${inquiry.status}`}>
                          {inquiry.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(inquiry.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/inquiry/${inquiry.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {inquiry.status !== "converted" && inquiry.status !== "rejected" && (
                            <Select
                              value={inquiry.status}
                              onValueChange={(value) =>
                                updateStatus.mutate({
                                  id: inquiry.id,
                                  status: value as any,
                                })
                              }
                            >
                              <SelectTrigger className="w-[100px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="parsed">Parsed</SelectItem>
                                <SelectItem value="quoted">Quoted</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No inquiries found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Orders Tab Component
function OrdersTab() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: orders, isLoading, refetch } = trpc.orders.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    search: search || undefined,
  });

  const updateStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      refetch();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground">Manage confirmed orders</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card className="shadow-elegant border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : orders && orders.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Order #</th>
                    <th className="px-4 py-3 text-left font-medium">Dealer</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <code className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                          {order.orderNumber}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{order.dealerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.dealerEmail || "-"}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        ${parseFloat(order.total as string).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium status-${order.status}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/order/${order.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {order.status !== "delivered" && order.status !== "cancelled" && (
                            <Select
                              value={order.status}
                              onValueChange={(value) =>
                                updateStatus.mutate({
                                  id: order.id,
                                  status: value as any,
                                })
                              }
                            >
                              <SelectTrigger className="w-[110px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="processing">Processing</SelectItem>
                                <SelectItem value="shipped">Shipped</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No orders found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


// Products Tab Component - Seller Central style catalog management
function ProductsTab() {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{ price?: string; stock?: number; leadTime?: number }>({});

  const { data: products, isLoading, refetch } = trpc.products.listWithOrderCount.useQuery();

  const updatePrice = trpc.products.updatePrice.useMutation({
    onSuccess: () => {
      toast.success("Price updated");
      refetch();
      setEditingId(null);
    },
  });

  const updateStock = trpc.products.updateStock.useMutation({
    onSuccess: () => {
      toast.success("Stock updated");
      refetch();
      setEditingId(null);
    },
  });

  const updateLeadTime = trpc.products.updateLeadTime.useMutation({
    onSuccess: () => {
      toast.success("Lead time updated");
      refetch();
      setEditingId(null);
    },
  });

  const filteredProducts = products?.filter(p => 
    !search || 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const startEditing = (product: any) => {
    setEditingId(product.id);
    setEditValues({
      price: product.unitPrice,
      stock: product.stockQuantity,
      leadTime: product.leadTimeDays,
    });
  };

  const saveChanges = (product: any) => {
    if (editValues.price !== product.unitPrice) {
      updatePrice.mutate({ id: product.id, price: editValues.price! });
    }
    if (editValues.stock !== product.stockQuantity) {
      updateStock.mutate({ id: product.id, stock: editValues.stock! });
    }
    if (editValues.leadTime !== product.leadTimeDays) {
      updateLeadTime.mutate({ id: product.id, leadTimeDays: editValues.leadTime! });
    }
    setEditingId(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValues({});
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Product Catalog</h1>
          <p className="text-muted-foreground">Manage prices, stock, and lead times</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Products Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          {filteredProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center justify-end gap-1">
                        <DollarSign className="w-3 h-3" />
                        Price
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center justify-end gap-1">
                        <Boxes className="w-3 h-3" />
                        Stock
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center justify-end gap-1">
                        <Truck className="w-3 h-3" />
                        Lead Time
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Orders</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredProducts.map((product) => {
                    const isEditing = editingId === product.id;
                    return (
                      <tr key={product.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium">{product.name}</p>
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-xs bg-muted px-2 py-1 rounded">{product.sku}</code>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{product.category}</td>
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editValues.price || ""}
                              onChange={(e) => setEditValues({ ...editValues, price: e.target.value })}
                              className="w-24 h-8 text-right ml-auto"
                            />
                          ) : (
                            <span className="font-semibold">${parseFloat(product.unitPrice).toFixed(2)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editValues.stock || 0}
                              onChange={(e) => setEditValues({ ...editValues, stock: parseInt(e.target.value) || 0 })}
                              className="w-20 h-8 text-right ml-auto"
                            />
                          ) : (
                            <span className={product.stockQuantity < 20 ? "text-orange-600 font-medium" : ""}>
                              {product.stockQuantity}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editValues.leadTime || 0}
                              onChange={(e) => setEditValues({ ...editValues, leadTime: parseInt(e.target.value) || 0 })}
                              className="w-16 h-8 text-right ml-auto"
                            />
                          ) : (
                            <span>{product.leadTimeDays}d</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {product.activeOrderCount > 0 ? (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              {product.activeOrderCount}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => saveChanges(product)}
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={cancelEditing}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditing(product)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No products found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Note */}
      <Card className="border-border/50 bg-blue-50/50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Price changes only affect future inquiries and orders. 
            Confirmed orders retain their original pricing.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// DO History Tab Component
function DOHistoryTab() {
  const [, navigate] = useLocation();
  const { data: orders, isLoading, refetch } = trpc.admin.doHistory.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Delivery Order History</h2>
          <p className="text-muted-foreground">View all generated delivery orders</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          {orders && orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      DO Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Dealer
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Generated At
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {order.orderNumber}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{order.dealerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.dealerEmail || "-"}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        ${parseFloat(order.total as string).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium status-${order.status}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {order.doGeneratedAt
                          ? new Date(order.doGeneratedAt).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/order/${order.id}`)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileBox className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No delivery orders generated yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                DOs will appear here after orders are processed
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
