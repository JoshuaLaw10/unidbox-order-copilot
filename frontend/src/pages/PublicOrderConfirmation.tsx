import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { 
  Package, CheckCircle, ArrowLeft, FileText, 
  Loader2, MapPin, Calendar, ShoppingCart, Download
} from "lucide-react";
import { generateDeliveryOrderPDF } from "@/lib/pdfGenerator";
import { toast } from "sonner";

export default function PublicOrderConfirmation() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const orderId = params.get("orderId");
  const orderNumber = params.get("orderNumber");

  // Fetch order details
  const { data: order, isLoading } = trpc.orders.getById.useQuery(
    { id: parseInt(orderId || "0") },
    { enabled: !!orderId }
  );

  const handleDownloadDO = () => {
    if (!order) return;
    
    try {
      generateDeliveryOrderPDF({
        orderNumber: order.orderNumber,
        orderDate: new Date(order.createdAt).toLocaleDateString(),
        dealerName: order.dealerName || order.companyName || 'Customer',
        dealerEmail: order.dealerEmail || undefined,
        dealerPhone: order.dealerPhone || order.contactNumber || undefined,
        deliveryAddress: order.deliveryAddress || undefined,
        requestedDeliveryDate: order.requestedDeliveryDate 
          ? new Date(order.requestedDeliveryDate).toLocaleDateString()
          : undefined,
        items: order.items.map((item: any) => ({
          sku: item.sku,
          productName: item.productName,
          quantity: item.quantity,
          unit: 'pcs',
          unitPrice: parseFloat(item.unitPrice),
          lineTotal: parseFloat(item.lineTotal),
        })),
        subtotal: parseFloat(order.subtotal),
        tax: parseFloat(order.tax),
        total: parseFloat(order.total),
        notes: order.notes || undefined,
      });
      toast.success("Delivery Order PDF downloaded");
    } catch (error) {
      toast.error("Failed to generate PDF");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md w-full mx-4 shadow-md border-0">
            <CardContent className="pt-6 text-center">
              <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Order not found</h2>
              <p className="text-gray-500 mb-6">The order you're looking for doesn't exist</p>
              <Button onClick={() => setLocation("/")} className="bg-orange-500 hover:bg-orange-600">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 container py-8">
        <div className="max-w-3xl mx-auto">
          {/* Success Banner */}
          <Card className="mb-8 border-green-200 bg-green-50 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-green-800">Order Placed Successfully!</h1>
                  <p className="text-green-700">
                    Your order <span className="font-semibold">{order.orderNumber}</span> has been received
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Details */}
          <Card className="shadow-md border-0">
            <CardHeader className="border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  Order Details
                </CardTitle>
                <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                  {order.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Order Info */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Order Number</p>
                  <p className="font-semibold">{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Order Date</p>
                  <p className="font-semibold">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {order.companyName && (
                  <div>
                    <p className="text-sm text-gray-500">Company Name</p>
                    <p className="font-semibold">{order.companyName}</p>
                  </div>
                )}
                {order.contactNumber && (
                  <div>
                    <p className="text-sm text-gray-500">Contact Number</p>
                    <p className="font-semibold">{order.contactNumber}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Delivery Info */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-500" />
                  Delivery Information
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Delivery Address</p>
                    <p className="font-medium">{order.deliveryAddress || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Requested Delivery Date</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {order.requestedDeliveryDate 
                        ? new Date(order.requestedDeliveryDate).toLocaleDateString()
                        : "Not specified"}
                    </p>
                  </div>
                </div>
                {order.notes && (
                  <div>
                    <p className="text-sm text-gray-500">Notes</p>
                    <p className="font-medium">{order.notes}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Order Items */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-orange-500" />
                  Order Items ({order.items.length})
                </h3>
                <div className="space-y-2">
                  {order.items.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{item.quantity} × ${parseFloat(item.unitPrice).toFixed(2)}</p>
                        <p className="text-sm font-semibold text-orange-600">
                          ${parseFloat(item.lineTotal).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Order Total */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">${parseFloat(order.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">${parseFloat(order.tax).toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-orange-600">${parseFloat(order.total).toFixed(2)}</span>
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                  onClick={handleDownloadDO}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Delivery Order
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1"
                  onClick={() => setLocation("/catalog")}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Continue Shopping
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info Note */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Save your order number <span className="font-semibold">{order.orderNumber}</span> for future reference.
            Our team will process your order and contact you if needed.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
