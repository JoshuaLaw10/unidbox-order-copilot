import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { useState, useRef } from "react";
import { useLocation, useParams } from "wouter";
import {
  Package,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  MapPin,
  Phone,
  Mail,
  FileText,
  Download,
  Printer,
  User,
  Clock,
} from "lucide-react";
import { generateDeliveryOrderPDF } from "@/lib/pdfGenerator";
import { toast } from "sonner";

interface OrderItem {
  id: number;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

interface DeliveryOrderData {
  orderNumber: string;
  orderDate: string;
  dealerName: string;
  dealerEmail?: string;
  dealerPhone?: string;
  deliveryAddress?: string;
  requestedDeliveryDate?: string;
  items: {
    sku: string;
    productName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const orderId = parseInt(id || "0");
  const printRef = useRef<HTMLDivElement>(null);

  const [doData, setDoData] = useState<DeliveryOrderData | null>(null);
  const [isGeneratingDO, setIsGeneratingDO] = useState(false);

  const { data: order, isLoading, refetch } = trpc.orders.getById.useQuery(
    { id: orderId },
    { enabled: orderId > 0 }
  );

  const generateDO = trpc.orders.generateDO.useMutation({
    onSuccess: (data) => {
      setDoData(data);
      toast.success("Delivery Order generated!");
    },
    onError: (error) => {
      toast.error("Failed to generate DO: " + error.message);
    },
  });

  const confirmOrder = trpc.orders.confirm.useMutation({
    onSuccess: () => {
      toast.success("Order confirmed!");
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to confirm order: " + error.message);
    },
  });

  const handleGenerateDO = async () => {
    setIsGeneratingDO(true);
    try {
      await generateDO.mutateAsync({ orderId });
    } finally {
      setIsGeneratingDO(false);
    }
  };

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML;
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Delivery Order - ${order?.orderNumber}</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
              .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
              .logo { font-size: 24px; font-weight: bold; color: #4338ca; }
              .do-title { font-size: 28px; font-weight: bold; color: #1f2937; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
              .info-box { padding: 16px; background: #f9fafb; border-radius: 8px; }
              .info-label { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
              .info-value { font-weight: 600; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
              th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
              td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
              .text-right { text-align: right; }
              .totals { margin-left: auto; width: 300px; }
              .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
              .total-final { font-size: 18px; font-weight: bold; border-top: 2px solid #e5e7eb; padding-top: 12px; }
              .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
              @media print { body { padding: 20px; } }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The order you're looking for doesn't exist.
            </p>
            <Button onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const items = (order.items || []) as OrderItem[];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-elegant">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold">Order {order.orderNumber}</h1>
              <p className="text-xs text-muted-foreground">
                {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium status-${order.status}`}
            >
              {order.status}
            </span>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Summary */}
            <Card className="shadow-elegant border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Dealer</p>
                        <p className="font-medium">{order.dealerName}</p>
                      </div>
                    </div>
                    {order.dealerEmail && (
                      <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="font-medium">{order.dealerEmail}</p>
                        </div>
                      </div>
                    )}
                    {order.dealerPhone && (
                      <div className="flex items-start gap-3">
                        <Phone className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="font-medium">{order.dealerPhone}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {order.deliveryAddress && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Delivery Address
                          </p>
                          <p className="font-medium">{order.deliveryAddress}</p>
                        </div>
                      </div>
                    )}
                    {order.requestedDeliveryDate && (
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Requested Delivery
                          </p>
                          <p className="font-medium">
                            {new Date(order.requestedDeliveryDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Order Date</p>
                        <p className="font-medium">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Product</th>
                        <th className="px-4 py-3 text-left font-medium">SKU</th>
                        <th className="px-4 py-3 text-right font-medium">Qty</th>
                        <th className="px-4 py-3 text-right font-medium">Price</th>
                        <th className="px-4 py-3 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">{item.productName}</td>
                          <td className="px-4 py-3">
                            <code className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                              {item.sku}
                            </code>
                          </td>
                          <td className="px-4 py-3 text-right">{item.quantity}</td>
                          <td className="px-4 py-3 text-right">
                            ${parseFloat(item.unitPrice).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            ${parseFloat(item.lineTotal).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/30">
                      <tr>
                        <td colSpan={4} className="px-4 py-2 text-right">
                          Subtotal
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          ${parseFloat(order.subtotal as string).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={4} className="px-4 py-2 text-right">
                          Tax
                        </td>
                        <td className="px-4 py-2 text-right">
                          ${parseFloat(order.tax as string).toFixed(2)}
                        </td>
                      </tr>
                      <tr className="text-lg">
                        <td colSpan={4} className="px-4 py-3 text-right font-semibold">
                          Total
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-primary">
                          ${parseFloat(order.total as string).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {order.notes && (
                  <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{order.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delivery Order Preview */}
            {doData && (
              <Card className="shadow-elegant border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-accent" />
                      Delivery Order
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="w-4 h-4 mr-2" />
                        Print
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => generateDeliveryOrderPDF(doData)}>
                        <Download className="w-4 h-4 mr-2" />
                        PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    ref={printRef}
                    className="p-6 bg-white border rounded-lg"
                  >
                    {/* DO Header */}
                    <div className="header flex justify-between items-start mb-8">
                      <div>
                        <div className="logo text-2xl font-bold text-primary">
                          UnidBox
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Wholesale Distribution
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="do-title text-2xl font-bold">
                          DELIVERY ORDER
                        </div>
                        <p className="text-lg font-semibold text-primary">
                          {doData.orderNumber}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Date: {doData.orderDate}
                        </p>
                      </div>
                    </div>

                    {/* DO Info */}
                    <div className="info-grid grid grid-cols-2 gap-6 mb-8">
                      <div className="info-box p-4 bg-muted/30 rounded-lg">
                        <div className="info-label text-xs text-muted-foreground mb-1">
                          Bill To
                        </div>
                        <div className="info-value font-semibold">
                          {doData.dealerName}
                        </div>
                        {doData.dealerEmail && (
                          <p className="text-sm">{doData.dealerEmail}</p>
                        )}
                        {doData.dealerPhone && (
                          <p className="text-sm">{doData.dealerPhone}</p>
                        )}
                      </div>
                      <div className="info-box p-4 bg-muted/30 rounded-lg">
                        <div className="info-label text-xs text-muted-foreground mb-1">
                          Ship To
                        </div>
                        <div className="info-value font-semibold">
                          {doData.deliveryAddress || doData.dealerName}
                        </div>
                        {doData.requestedDeliveryDate && (
                          <p className="text-sm">
                            Delivery: {doData.requestedDeliveryDate}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* DO Items */}
                    <table className="w-full mb-6">
                      <thead>
                        <tr className="border-b-2 border-border">
                          <th className="py-3 text-left font-semibold">SKU</th>
                          <th className="py-3 text-left font-semibold">
                            Description
                          </th>
                          <th className="py-3 text-right font-semibold">Qty</th>
                          <th className="py-3 text-right font-semibold">
                            Unit Price
                          </th>
                          <th className="py-3 text-right font-semibold">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {doData.items.map((item, index) => (
                          <tr key={index} className="border-b border-border/50">
                            <td className="py-3">{item.sku}</td>
                            <td className="py-3">{item.productName}</td>
                            <td className="py-3 text-right">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="py-3 text-right">
                              ${item.unitPrice.toFixed(2)}
                            </td>
                            <td className="py-3 text-right font-medium">
                              ${item.lineTotal.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* DO Totals */}
                    <div className="totals ml-auto w-72">
                      <div className="total-row flex justify-between py-2">
                        <span>Subtotal</span>
                        <span>${doData.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="total-row flex justify-between py-2">
                        <span>Tax</span>
                        <span>${doData.tax.toFixed(2)}</span>
                      </div>
                      <div className="total-final flex justify-between py-3 border-t-2 border-border font-bold text-lg">
                        <span>Total</span>
                        <span className="text-primary">
                          ${doData.total.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* DO Footer */}
                    <div className="footer mt-12 pt-6 border-t border-border text-center text-sm text-muted-foreground">
                      <p>Thank you for your business!</p>
                      <p className="mt-1">
                        UnidBox Wholesale Distribution • AI-Powered Order
                        Automation
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Actions */}
          <div className="space-y-6">
            {/* Order Status */}
            <Card className="shadow-elegant border-border/50">
              <CardHeader>
                <CardTitle>Order Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      order.status === "pending"
                        ? "bg-amber-500"
                        : order.status === "confirmed"
                        ? "bg-blue-500"
                        : order.status === "delivered"
                        ? "bg-green-500"
                        : "bg-gray-400"
                    }`}
                  />
                  <span className="font-medium capitalize">{order.status}</span>
                </div>

                {order.status === "pending" && (
                  <Button
                    className="w-full"
                    onClick={() => confirmOrder.mutate({ orderId })}
                    disabled={confirmOrder.isPending}
                  >
                    {confirmOrder.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Confirm Order
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Generate DO */}
            <Card className="shadow-elegant border-border/50">
              <CardHeader>
                <CardTitle>Delivery Order</CardTitle>
                <CardDescription>
                  Generate a printable delivery order document
                </CardDescription>
              </CardHeader>
              <CardContent>
                {order.doGeneratedAt ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Generated on{" "}
                      {new Date(order.doGeneratedAt).toLocaleDateString()}
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleGenerateDO}
                      disabled={isGeneratingDO}
                    >
                      {isGeneratingDO ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4 mr-2" />
                      )}
                      Regenerate DO
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    onClick={handleGenerateDO}
                    disabled={isGeneratingDO}
                  >
                    {isGeneratingDO ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Generate Delivery Order
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="shadow-elegant border-border/50">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/")}
                >
                  <Package className="w-4 h-4 mr-2" />
                  New Inquiry
                </Button>
                {doData && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handlePrint}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print DO
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
