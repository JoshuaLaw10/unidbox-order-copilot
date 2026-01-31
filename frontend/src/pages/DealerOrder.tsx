import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Package, ArrowLeft, ShoppingCart, Plus, Minus, 
  Loader2, Truck, MapPin, Calendar, FileText,
  CheckCircle, AlertCircle, Trash2
} from "lucide-react";
import { toast } from "sonner";

type CartItem = {
  sku: string;
  name: string;
  unitPrice: number;
  unit: string;
  quantity: number;
  stockQuantity: number;
  leadTimeDays: number;
};

export default function DealerOrder() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{ orderId: string; orderNumber: string } | null>(null);

  // Fetch dealer profile
  const { data: profile } = trpc.dealer.profile.useQuery(undefined, {
    enabled: !!user && user.role === 'dealer',
  });

  // Create order mutation
  const createOrder = trpc.orders.createDirect.useMutation({
    onSuccess: (data) => {
      setOrderSuccess({ orderId: data.orderId.toString(), orderNumber: data.orderNumber });
      sessionStorage.removeItem('dealerCart');
      toast.success("Order submitted successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit order");
      setIsSubmitting(false);
    },
  });

  // Load cart from session storage
  useEffect(() => {
    const saved = sessionStorage.getItem('dealerCart');
    if (saved) {
      const items = JSON.parse(saved);
      if (items.length > 0) {
        setCart(items);
      } else {
        // No items in cart, redirect back
        setLocation("/dealer");
      }
    } else {
      setLocation("/dealer");
    }
  }, [setLocation]);

  // Pre-fill delivery address from dealer profile
  useEffect(() => {
    if (profile?.address && !deliveryAddress) {
      setDeliveryAddress(profile.address);
    }
  }, [profile, deliveryAddress]);

  // Calculate minimum delivery date based on lead times
  const minDeliveryDate = useMemo(() => {
    if (cart.length === 0) return "";
    const maxLeadTime = Math.max(...cart.map(item => item.leadTimeDays));
    const date = new Date();
    date.setDate(date.getDate() + maxLeadTime);
    return date.toISOString().split('T')[0];
  }, [cart]);

  const updateCartQuantity = (sku: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(sku);
      return;
    }
    setCart(prev => {
      const updated = prev.map(item => 
        item.sku === sku ? { ...item, quantity: newQty } : item
      );
      sessionStorage.setItem('dealerCart', JSON.stringify(updated));
      return updated;
    });
  };

  const removeFromCart = (sku: string) => {
    setCart(prev => {
      const updated = prev.filter(item => item.sku !== sku);
      sessionStorage.setItem('dealerCart', JSON.stringify(updated));
      if (updated.length === 0) {
        setLocation("/dealer");
      }
      return updated;
    });
    toast.info("Item removed");
  };

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  }, [cart]);

  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const handleSubmit = async () => {
    if (!deliveryAddress.trim()) {
      toast.error("Please enter a delivery address");
      return;
    }

    setIsSubmitting(true);

    // Build order items
    const items = cart.map(item => ({
      sku: item.sku,
      productName: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      unit: item.unit,
    }));

    createOrder.mutate({
      items,
      deliveryAddress: deliveryAddress.trim(),
      deliveryDate: deliveryDate || undefined,
      notes: notes.trim() || undefined,
    });
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

  // Order Success Screen
  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-0 shadow-lg">
          <CardContent className="pt-8 pb-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Order Submitted!</h2>
            <p className="text-slate-600 mb-6">
              Your order has been received and is being processed.
            </p>
            
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-500">Order Number</p>
              <p className="text-xl font-bold text-blue-600">{orderSuccess.orderNumber}</p>
            </div>

            <div className="space-y-3">
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => setLocation(`/order/${orderSuccess.orderId}`)}
              >
                <FileText className="w-4 h-4 mr-2" />
                View Order Details
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setLocation("/dealer")}
              >
                Continue Shopping
              </Button>
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => setLocation("/dealer/orders")}
              >
                View All Orders
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b bg-white shadow-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center">
          <Button variant="ghost" onClick={() => setLocation("/dealer")} className="mr-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Catalog
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-slate-900">UnidBox</span>
          </div>
          <div className="ml-auto text-right">
            <p className="text-sm font-medium text-slate-900">{profile?.name || user.name}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">Complete Your Order</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Items */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Order Items ({cart.length})
                  </CardTitle>
                  <CardDescription>Review and adjust quantities</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cart.map(item => {
                    const isLowStock = item.quantity > item.stockQuantity;
                    return (
                      <div key={item.sku} className="flex gap-4 p-4 bg-slate-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-slate-500">SKU: {item.sku}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              ${item.unitPrice.toFixed(2)} / {item.unit}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <Truck className="w-3 h-3 mr-1" />
                              {item.leadTimeDays}d lead
                            </Badge>
                          </div>
                          {isLowStock && (
                            <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Only {item.stockQuantity} available
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="outline" 
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateCartQuantity(item.sku, item.quantity - 1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateCartQuantity(item.sku, parseInt(e.target.value) || 0)}
                              className="w-20 h-8 text-center"
                            />
                            <Button 
                              variant="outline" 
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateCartQuantity(item.sku, item.quantity + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="text-lg font-bold">
                            ${(item.unitPrice * item.quantity).toFixed(2)}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-slate-400 hover:text-red-500"
                          onClick={() => removeFromCart(item.sku)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Delivery Details */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Delivery Details
                  </CardTitle>
                  <CardDescription>Where should we deliver your order?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address" className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Delivery Address *
                    </Label>
                    <Textarea
                      id="address"
                      placeholder="Enter full delivery address"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Preferred Delivery Date
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      min={minDeliveryDate}
                    />
                    {minDeliveryDate && (
                      <p className="text-xs text-slate-500">
                        Earliest available: {new Date(minDeliveryDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any special delivery instructions or requirements..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="border-0 shadow-sm sticky top-24">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Subtotal ({cart.length} items)</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Estimated Tax (8%)</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-blue-600">${total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 text-sm">
                    <p className="font-medium text-slate-700 mb-1">Ordering as:</p>
                    <p className="text-slate-600">{profile?.name || user.name}</p>
                    <p className="text-slate-500 text-xs">{user.email}</p>
                  </div>

                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={isSubmitting || cart.length === 0 || !deliveryAddress.trim()}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Submit Order
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-slate-500 text-center">
                    By submitting, you agree to our terms and conditions
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
