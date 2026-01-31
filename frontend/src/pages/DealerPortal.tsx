import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, LogOut, Send, FileText, ShoppingCart, 
  Loader2, Clock, CheckCircle, XCircle, Sparkles,
  Building2, User
} from "lucide-react";
import { format } from "date-fns";

export default function DealerPortal() {
  const [, setLocation] = useLocation();
  const { user, logout, loading } = useAuth();
  const [inquiry, setInquiry] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch dealer profile
  const { data: profile } = trpc.dealer.profile.useQuery(undefined, {
    enabled: !!user && user.role === 'dealer',
  });

  // Fetch dealer's inquiries
  const { data: inquiries, refetch: refetchInquiries } = trpc.dealer.inquiries.useQuery(undefined, {
    enabled: !!user && user.role === 'dealer',
  });

  // Fetch dealer's orders
  const { data: orders, refetch: refetchOrders } = trpc.dealer.orders.useQuery(undefined, {
    enabled: !!user && user.role === 'dealer',
  });

  const submitInquiry = trpc.inquiries.submit.useMutation({
    onSuccess: (data) => {
      setLocation(`/inquiry/${data.inquiryId}`);
    },
  });

  const handleSubmitInquiry = async () => {
    if (!inquiry.trim()) return;
    setIsSubmitting(true);
    try {
      await submitInquiry.mutateAsync({
        rawInquiry: inquiry,
        dealerName: profile?.name,
        dealerEmail: profile?.email || undefined,
        dealerPhone: profile?.phone || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <a href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-slate-900">UnidBox</span>
            <Badge variant="outline" className="ml-2 text-blue-600 border-blue-200">Dealer Portal</Badge>
          </a>
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
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - New Inquiry */}
          <div className="lg:col-span-1">
            {/* Dealer Profile Card */}
            {profile && (
              <Card className="mb-6 border-0 shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{profile.name}</CardTitle>
                      <CardDescription>{profile.email}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-slate-600">
                  {profile.phone && <p>📞 {profile.phone}</p>}
                  {profile.address && <p className="mt-1">📍 {profile.address}</p>}
                </CardContent>
              </Card>
            )}

            {/* New Inquiry Card */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  New Inquiry
                </CardTitle>
                <CardDescription>
                  Describe what you need in plain English
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Example: I need 50 LED panel lights, 100 shipping boxes, and 200 safety vests. Delivery by next Friday."
                  value={inquiry}
                  onChange={(e) => setInquiry(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={handleSubmitInquiry}
                  disabled={isSubmitting || !inquiry.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Inquiry
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Inquiries & Orders */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="inquiries" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="inquiries" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  My Inquiries ({inquiries?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="orders" className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  My Orders ({orders?.length || 0})
                </TabsTrigger>
              </TabsList>

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
                      <p className="text-sm text-slate-400">Submit your first inquiry to get started</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

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
                                DO Generated
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
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
