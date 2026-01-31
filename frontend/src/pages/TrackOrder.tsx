import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { 
  Package, 
  Search, 
  ArrowLeft,
  Mail,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Download
} from "lucide-react";
import { generateDeliveryOrderPDF } from "@/lib/pdfGenerator";

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: "Pending", icon: <Clock className="w-4 h-4" />, color: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Confirmed", icon: <CheckCircle2 className="w-4 h-4" />, color: "bg-blue-100 text-blue-800" },
  processing: { label: "Processing", icon: <Package className="w-4 h-4" />, color: "bg-purple-100 text-purple-800" },
  shipped: { label: "Shipped", icon: <Truck className="w-4 h-4" />, color: "bg-cyan-100 text-cyan-800" },
  delivered: { label: "Delivered", icon: <CheckCircle2 className="w-4 h-4" />, color: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", icon: <XCircle className="w-4 h-4" />, color: "bg-red-100 text-red-800" },
};

export default function TrackOrder() {
  const [email, setEmail] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const { data: orders, isLoading, refetch } = trpc.orders.getByEmail.useQuery(
    { email },
    { enabled: false }
  );

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    setHasSearched(true);
    await refetch();
  };

  const handleDownloadDO = async (order: NonNullable<typeof orders>[number]) => {
    try {
      const doData = {
        orderNumber: order.orderNumber,
        orderDate: new Date(order.createdAt).toLocaleDateString(),
        dealerName: order.dealerName || order.companyName || "Customer",
        dealerEmail: order.dealerEmail || "",
        deliveryAddress: order.deliveryAddress || "",
        deliveryDate: order.requestedDeliveryDate ? new Date(order.requestedDeliveryDate).toLocaleDateString() : "",
        items: order.items.map((item: { sku: string; productName: string; quantity: number; unitPrice: string; lineTotal: string }) => ({
          sku: item.sku,
          productName: item.productName,
          quantity: item.quantity,
          unit: "pcs",
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal),
        })),
        subtotal: Number(order.subtotal),
        tax: Number(order.tax),
        total: Number(order.total),
        notes: order.notes || "",
      };
      
      generateDeliveryOrderPDF(doData);
      toast.success("Delivery Order PDF downloaded!");
    } catch (error) {
      toast.error("Failed to generate PDF");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 container py-8">
        <div className="max-w-3xl mx-auto">
          {/* Back Link */}
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          {/* Search Card */}
          <Card className="mb-8 shadow-md border-0">
            <CardHeader className="border-b bg-gray-50">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Search className="w-5 h-5 text-orange-500" />
                Track Your Orders
              </CardTitle>
              <CardDescription>
                Enter your email address to view all your orders
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSearch} className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="email" className="sr-only">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={isLoading} className="bg-orange-500 hover:bg-orange-600 px-6">
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Results */}
          {hasSearched && (
            <div className="space-y-4">
              {isLoading ? (
                <Card className="shadow-md border-0">
                  <CardContent className="py-12 text-center">
                    <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Searching for your orders...</p>
                  </CardContent>
                </Card>
              ) : orders && orders.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">
                      Found {orders.length} order{orders.length !== 1 ? "s" : ""}
                    </h2>
                  </div>
                  {orders.map((order) => {
                    const status = statusConfig[order.status] || statusConfig.pending;
                    return (
                      <Card key={order.id} className="shadow-md border-0">
                        <CardContent className="p-6">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-semibold text-lg">{order.orderNumber}</h3>
                                <Badge className={status.color}>
                                  {status.icon}
                                  <span className="ml-1">{status.label}</span>
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-500">
                                Placed on {new Date(order.createdAt).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-semibold text-gray-900">
                                ${Number(order.total).toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>

                          {/* Order Items */}
                          <div className="border rounded-lg overflow-hidden mb-4">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="text-left py-2 px-3 font-medium">Product</th>
                                  <th className="text-center py-2 px-3 font-medium">Qty</th>
                                  <th className="text-right py-2 px-3 font-medium">Price</th>
                                </tr>
                              </thead>
                              <tbody>
                                {order.items.slice(0, 3).map((item, idx) => (
                                  <tr key={idx} className="border-t">
                                    <td className="py-2 px-3">
                                      <p className="font-medium">{item.productName}</p>
                                      <p className="text-xs text-gray-500">{item.sku}</p>
                                    </td>
                                    <td className="py-2 px-3 text-center">{item.quantity}</td>
                                    <td className="py-2 px-3 text-right">${Number(item.lineTotal).toFixed(2)}</td>
                                  </tr>
                                ))}
                                {order.items.length > 3 && (
                                  <tr className="border-t">
                                    <td colSpan={3} className="py-2 px-3 text-center text-gray-500">
                                      +{order.items.length - 3} more item{order.items.length - 3 !== 1 ? "s" : ""}
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* Delivery Info */}
                          {order.deliveryAddress && (
                            <div className="bg-gray-50 rounded-lg p-3 mb-4">
                              <p className="text-sm">
                                <span className="font-medium">Delivery Address:</span>{" "}
                                {order.deliveryAddress}
                              </p>
                              {order.requestedDeliveryDate && (
                                <p className="text-sm mt-1">
                                  <span className="font-medium">Requested Delivery:</span>{" "}
                                  {new Date(order.requestedDeliveryDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadDO(order)}
                              className="text-orange-600 border-orange-200 hover:bg-orange-50"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download DO
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              ) : (
                <Card className="shadow-md border-0">
                  <CardContent className="py-12 text-center">
                    <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">No orders found</h3>
                    <p className="text-gray-500 mb-4">
                      We couldn't find any orders associated with this email address.
                    </p>
                    <Link href="/catalog">
                      <Button className="bg-orange-500 hover:bg-orange-600">
                        Browse Products
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
