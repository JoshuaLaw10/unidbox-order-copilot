import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, LogOut, ArrowLeft, FileText, ShoppingCart, 
  Loader2, Clock, Download
} from "lucide-react";
import { format } from "date-fns";

export default function DealerOrders() {
  const [, setLocation] = useLocation();
  const { user, logout, loading } = useAuth();

  // Fetch dealer profile
  const { data: profile } = trpc.dealer.profile.useQuery(undefined, {
    enabled: !!user && user.role === 'dealer',
  });

  // Fetch dealer's inquiries
  const { data: inquiries } = trpc.dealer.inquiries.useQuery(undefined, {
    enabled: !!user && user.role === 'dealer',
  });

  // Fetch dealer's orders
  const { data: orders } = trpc.dealer.orders.useQuery(undefined, {
    enabled: !!user && user.role === 'dealer',
  });

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user || user.role !== 'dealer') {
    setLocation("/unauthorized");
    return null;
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      parsed: "bg-blue-100 text-blue-700",
      quoted: "bg-purple-100 text-purple-700",
      converted: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
      confirmed: "bg-green-100 text-green-700",
      processing: "bg-blue-100 text-blue-700",
      shipped: "bg-indigo-100 text-indigo-700",
      delivered: "bg-emerald-100 text-emerald-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return <Badge className={styles[status] || "bg-gray-100 text-gray-700"}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="border-b bg-white shadow-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/dealer")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Catalog
            </Button>
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-slate-900">UnidBox</span>
              <Badge variant="outline" className="ml-2 text-blue-600 border-blue-200">Dealer</Badge>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-900">{user.name || user.email}</p>
              <p className="text-xs text-slate-500">{profile?.name || 'Dealer'}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">My Orders & Inquiries</h1>

          <Tabs defaultValue="orders" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Orders ({orders?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="inquiries" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Inquiries ({inquiries?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="orders">
              {orders && orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <Card 
                      key={order.id} 
                      className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setLocation(`/order/${order.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-slate-900">{order.orderNumber}</span>
                              {getStatusBadge(order.status)}
                            </div>
                            <p className="text-lg font-semibold text-blue-600">
                              ${parseFloat(order.total as string).toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-400 mt-2">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {format(new Date(order.createdAt), "MMM d, yyyy h:mm a")}
                            </p>
                          </div>
                          {order.doGeneratedAt && (
                            <Badge variant="outline" className="text-green-600 border-green-200">
                              <Download className="w-3 h-3 mr-1" />
                              DO Ready
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-0 shadow-sm">
                  <CardContent className="py-12 text-center">
                    <ShoppingCart className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">No orders yet</p>
                    <p className="text-sm text-slate-400">Your confirmed orders will appear here</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="inquiries">
              {inquiries && inquiries.length > 0 ? (
                <div className="space-y-4">
                  {inquiries.map((inq) => (
                    <Card 
                      key={inq.id} 
                      className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setLocation(`/inquiry/${inq.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-slate-900">Inquiry #{inq.id}</span>
                              {getStatusBadge(inq.status)}
                            </div>
                            <p className="text-sm text-slate-600 line-clamp-2">{inq.rawInquiry}</p>
                            <p className="text-xs text-slate-400 mt-2">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {format(new Date(inq.createdAt), "MMM d, yyyy h:mm a")}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-0 shadow-sm">
                  <CardContent className="py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">No inquiries yet</p>
                    <p className="text-sm text-slate-400">Browse the catalog and submit your first inquiry</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
