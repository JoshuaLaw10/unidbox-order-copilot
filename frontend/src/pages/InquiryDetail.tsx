import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import {
  Package,
  ArrowLeft,
  Bot,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  Sparkles,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";

interface ParsedItem {
  productName: string;
  productSku?: string | null;
  quantity: number;
  unit?: string;
  notes?: string | null;
}

interface ParsedData {
  dealerName?: string | null;
  dealerEmail?: string | null;
  dealerPhone?: string | null;
  items: ParsedItem[];
  requestedDeliveryDate?: string | null;
  deliveryAddress?: string | null;
  generalNotes?: string | null;
  confidence: number;
}

interface PricingItem {
  productName: string;
  productSku: string;
  requestedQuantity: number;
  availableQuantity: number;
  isAvailable: boolean;
  unitPrice: number;
  unit: string;
  lineTotal: number;
  leadTimeDays: number;
  minOrderQuantity: number;
  notes?: string;
}

interface PricingResponse {
  items: PricingItem[];
  subtotal: number;
  estimatedTax: number;
  total: number;
  earliestDeliveryDate: string;
  allItemsAvailable: boolean;
  message: string;
}

export default function InquiryDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const inquiryId = parseInt(id || "0");

  const [pricingData, setPricingData] = useState<PricingResponse | null>(null);
  const [isLoadingPricing, setIsLoadingPricing] = useState(false);
  const [dealerName, setDealerName] = useState("");
  const [dealerEmail, setDealerEmail] = useState("");
  const [dealerPhone, setDealerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const { data: inquiry, isLoading } = trpc.inquiries.getById.useQuery(
    { id: inquiryId },
    { enabled: inquiryId > 0 }
  );

  const getPricing = trpc.inquiries.getPricing.useMutation({
    onSuccess: (data) => {
      setPricingData(data);
    },
    onError: (error) => {
      toast.error("Failed to get pricing: " + error.message);
    },
  });

  const createOrder = trpc.orders.createFromInquiry.useMutation({
    onSuccess: (data) => {
      toast.success("Order created successfully!");
      navigate(`/order/${data.orderId}`);
    },
    onError: (error) => {
      toast.error("Failed to create order: " + error.message);
    },
  });

  const parsedData = inquiry?.parsedData as ParsedData | null;

  // Initialize form fields from parsed data
  useEffect(() => {
    if (parsedData) {
      setDealerName(parsedData.dealerName || inquiry?.dealerName || "");
      setDealerEmail(parsedData.dealerEmail || inquiry?.dealerEmail || "");
      setDealerPhone(parsedData.dealerPhone || inquiry?.dealerPhone || "");
      setDeliveryAddress(parsedData.deliveryAddress || "");
      setDeliveryDate(parsedData.requestedDeliveryDate || "");
      setNotes(parsedData.generalNotes || "");
    }
  }, [parsedData, inquiry]);

  // Load pricing from inquiry if already quoted
  useEffect(() => {
    if (inquiry?.pricingResponse) {
      setPricingData(inquiry.pricingResponse as PricingResponse);
    }
  }, [inquiry]);

  const handleGetPricing = async () => {
    setIsLoadingPricing(true);
    try {
      await getPricing.mutateAsync({ inquiryId });
    } finally {
      setIsLoadingPricing(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!pricingData || !dealerName) {
      toast.error("Please fill in dealer name and get pricing first");
      return;
    }

    const availableItems = pricingData.items.filter(
      (item) => item.isAvailable && item.productSku !== "NOT_FOUND"
    );

    if (availableItems.length === 0) {
      toast.error("No available items to order");
      return;
    }

    setIsCreatingOrder(true);
    try {
      await createOrder.mutateAsync({
        inquiryId,
        dealerName,
        dealerEmail: dealerEmail || undefined,
        dealerPhone: dealerPhone || undefined,
        deliveryAddress: deliveryAddress || undefined,
        requestedDeliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        items: availableItems.map((item) => ({
          productSku: item.productSku,
          productName: item.productName,
          quantity: item.requestedQuantity,
          unitPrice: item.unitPrice,
        })),
        notes: notes || undefined,
      });
    } finally {
      setIsCreatingOrder(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Inquiry Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The inquiry you're looking for doesn't exist.
            </p>
            <Button onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              <h1 className="font-semibold">Inquiry #{inquiry.id}</h1>
              <p className="text-xs text-muted-foreground">
                {new Date(inquiry.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="ml-auto">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium status-${inquiry.status}`}
            >
              {inquiry.status}
            </span>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Original Inquiry & Parsed Data */}
          <div className="lg:col-span-2 space-y-6">
            {/* Original Inquiry */}
            <Card className="shadow-elegant border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Original Inquiry
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="whitespace-pre-wrap text-sm">{inquiry.rawInquiry}</p>
                </div>
              </CardContent>
            </Card>

            {/* AI Parsed Results */}
            {parsedData && (
              <Card className="shadow-elegant border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="w-5 h-5 text-accent" />
                      AI Interpretation
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Confidence:</span>
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full"
                          style={{ width: `${parsedData.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium">
                        {Math.round(parsedData.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                  <CardDescription>
                    Our AI has extracted the following items from your inquiry
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Parsed Items Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium">Product</th>
                            <th className="px-4 py-3 text-left font-medium">SKU</th>
                            <th className="px-4 py-3 text-right font-medium">Qty</th>
                            <th className="px-4 py-3 text-left font-medium">Unit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {parsedData.items.map((item, index) => (
                            <tr key={index} className="hover:bg-muted/30">
                              <td className="px-4 py-3">{item.productName}</td>
                              <td className="px-4 py-3">
                                {item.productSku ? (
                                  <code className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                                    {item.productSku}
                                  </code>
                                ) : (
                                  <span className="text-muted-foreground text-xs">
                                    Not matched
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-medium">
                                {item.quantity}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {item.unit || "pcs"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Additional Parsed Info */}
                    {(parsedData.requestedDeliveryDate || parsedData.deliveryAddress) && (
                      <div className="grid sm:grid-cols-2 gap-4 pt-2">
                        {parsedData.requestedDeliveryDate && (
                          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                            <Calendar className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Requested Delivery
                              </p>
                              <p className="font-medium">
                                {parsedData.requestedDeliveryDate}
                              </p>
                            </div>
                          </div>
                        )}
                        {parsedData.deliveryAddress && (
                          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                            <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Delivery Address
                              </p>
                              <p className="font-medium">{parsedData.deliveryAddress}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pricing Results */}
            {pricingData && (
              <Card className="shadow-elegant border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-chart-1" />
                    Pricing & Availability
                  </CardTitle>
                  <CardDescription>{pricingData.message}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Pricing Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium">Product</th>
                            <th className="px-4 py-3 text-right font-medium">Qty</th>
                            <th className="px-4 py-3 text-right font-medium">Price</th>
                            <th className="px-4 py-3 text-right font-medium">Total</th>
                            <th className="px-4 py-3 text-center font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {pricingData.items.map((item, index) => (
                            <tr
                              key={index}
                              className={`hover:bg-muted/30 ${
                                !item.isAvailable ? "bg-destructive/5" : ""
                              }`}
                            >
                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-medium">{item.productName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.productSku}
                                  </p>
                                  {item.notes && (
                                    <p className="text-xs text-amber-600 mt-1">
                                      {item.notes}
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {item.requestedQuantity} {item.unit}
                              </td>
                              <td className="px-4 py-3 text-right">
                                ${item.unitPrice.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right font-medium">
                                ${item.lineTotal.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {item.isAvailable ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                    <CheckCircle2 className="w-4 h-4" />
                                    In Stock
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs text-destructive">
                                    <AlertCircle className="w-4 h-4" />
                                    {item.productSku === "NOT_FOUND"
                                      ? "Not Found"
                                      : "Low Stock"}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-muted/30">
                          <tr>
                            <td colSpan={3} className="px-4 py-2 text-right">
                              Subtotal
                            </td>
                            <td className="px-4 py-2 text-right font-medium">
                              ${pricingData.subtotal.toFixed(2)}
                            </td>
                            <td></td>
                          </tr>
                          <tr>
                            <td colSpan={3} className="px-4 py-2 text-right">
                              Est. Tax (8%)
                            </td>
                            <td className="px-4 py-2 text-right">
                              ${pricingData.estimatedTax.toFixed(2)}
                            </td>
                            <td></td>
                          </tr>
                          <tr className="text-lg">
                            <td colSpan={3} className="px-4 py-3 text-right font-semibold">
                              Total
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-primary">
                              ${pricingData.total.toFixed(2)}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Delivery Info */}
                    <div className="flex items-center gap-4 p-4 bg-accent/10 rounded-lg">
                      <Clock className="w-5 h-5 text-accent" />
                      <div>
                        <p className="text-sm font-medium">Earliest Delivery Date</p>
                        <p className="text-lg font-semibold text-accent">
                          {pricingData.earliestDeliveryDate}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Actions & Order Form */}
          <div className="space-y-6">
            {/* Get Pricing Button */}
            {!pricingData && parsedData && (
              <Card className="shadow-elegant border-border/50">
                <CardContent className="pt-6">
                  <Button
                    className="w-full h-12"
                    onClick={handleGetPricing}
                    disabled={isLoadingPricing}
                  >
                    {isLoadingPricing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Checking Pricing...
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-5 h-5 mr-2" />
                        Get Pricing & Availability
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Order Form */}
            {pricingData && (
              <Card className="shadow-elegant border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                    Confirm Order
                  </CardTitle>
                  <CardDescription>
                    Review and confirm your order details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dealerName">
                      Dealer Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="dealerName"
                      value={dealerName}
                      onChange={(e) => setDealerName(e.target.value)}
                      placeholder="Your company name"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dealerEmail">Email</Label>
                      <Input
                        id="dealerEmail"
                        type="email"
                        value={dealerEmail}
                        onChange={(e) => setDealerEmail(e.target.value)}
                        placeholder="email@company.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dealerPhone">Phone</Label>
                      <Input
                        id="dealerPhone"
                        type="tel"
                        value={dealerPhone}
                        onChange={(e) => setDealerPhone(e.target.value)}
                        placeholder="+1 555-0000"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deliveryAddress">Delivery Address</Label>
                    <Input
                      id="deliveryAddress"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="123 Industrial Ave, City"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deliveryDate">Requested Delivery Date</Label>
                    <Input
                      id="deliveryDate"
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      min={pricingData.earliestDeliveryDate}
                    />
                    <p className="text-xs text-muted-foreground">
                      Earliest: {pricingData.earliestDeliveryDate}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Input
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any special instructions"
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Available Items</span>
                      <span>
                        {pricingData.items.filter((i) => i.isAvailable).length} of{" "}
                        {pricingData.items.length}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Order Total</span>
                      <span className="text-primary">
                        ${pricingData.total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full h-12"
                    onClick={handleCreateOrder}
                    disabled={
                      isCreatingOrder ||
                      !dealerName ||
                      !pricingData.items.some((i) => i.isAvailable)
                    }
                  >
                    {isCreatingOrder ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Creating Order...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Confirm Order
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
