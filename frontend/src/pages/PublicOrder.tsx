import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { 
  Package, ArrowLeft, ShoppingCart, Loader2, 
  MapPin, Calendar, FileText, Plus, Minus, Trash2,
  CheckCircle, Building2, Phone, Mail
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

export default function PublicOrder() {
  const [, setLocation] = useLocation();
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = sessionStorage.getItem('publicCart');
    return saved ? JSON.parse(saved) : [];
  });
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get session ID
  const sessionId = sessionStorage.getItem('publicSessionId') || '';

  // Sync cart changes back to session storage
  useEffect(() => {
    sessionStorage.setItem('publicCart', JSON.stringify(cart));
  }, [cart]);

  const createPublicOrder = trpc.orders.createPublic.useMutation({
    onSuccess: (data) => {
      // Clear cart after successful order
      sessionStorage.removeItem('publicCart');
      // Navigate to confirmation page
      setLocation(`/order/confirmation?orderId=${data.orderId}&orderNumber=${data.orderNumber}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create order");
    },
  });

  const updateCartQuantity = (sku: string, newQty: number) => {
    if (newQty <= 0) {
      setCart(prev => prev.filter(item => item.sku !== sku));
      toast.info("Item removed from order");
      return;
    }
    setCart(prev => prev.map(item => 
      item.sku === sku ? { ...item, quantity: newQty } : item
    ));
  };

  const removeFromCart = (sku: string) => {
    setCart(prev => prev.filter(item => item.sku !== sku));
    toast.info("Item removed from order");
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  }, [cart]);

  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    
    if (!deliveryAddress.trim()) {
      toast.error("Please enter a delivery address");
      return;
    }
    
    if (!deliveryDate) {
      toast.error("Please select a delivery date");
      return;
    }

    setIsSubmitting(true);
    try {
      await createPublicOrder.mutateAsync({
        sessionId,
        companyName: companyName || undefined,
        email: email || undefined,
        contactNumber: contactNumber || undefined,
        deliveryAddress,
        deliveryDate,
        notes: notes || undefined,
        items: cart.map(item => ({
          sku: item.sku,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md w-full mx-4 shadow-md border-0">
            <CardContent className="pt-6 text-center">
              <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Your cart is empty</h2>
              <p className="text-gray-500 mb-6">Add some products before placing an order</p>
              <Button onClick={() => setLocation("/catalog")} className="bg-orange-500 hover:bg-orange-600">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Browse Products
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header cartItemCount={cartItemCount} />

      <main className="flex-1 container py-8">
        <div className="max-w-5xl mx-auto">
          {/* Back Link */}
          <Button variant="ghost" onClick={() => setLocation("/catalog")} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Catalog
          </Button>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Complete Your Order</h1>
            <p className="text-gray-500 mt-1">Review your items and provide delivery details</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Order Items */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="shadow-md border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-orange-500" />
                      Order Items ({cart.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.sku} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{item.name}</h4>
                          <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                          <p className="text-sm font-semibold text-orange-600 mt-1">
                            ${item.unitPrice.toFixed(2)} / {item.unit}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-1 bg-white rounded-md border">
                            <Button
                              type="button"
                              variant="ghost"
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
                              className="w-16 h-8 text-center border-0"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateCartQuantity(item.sku, item.quantity + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="text-lg font-bold text-gray-900">
                            ${(item.unitPrice * item.quantity).toFixed(2)}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => removeFromCart(item.sku)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Delivery Details */}
                <Card className="shadow-md border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-orange-500" />
                      Delivery Details
                    </CardTitle>
                    <CardDescription>
                      Provide your delivery information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="companyName" className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          Company Name (Optional)
                        </Label>
                        <Input
                          id="companyName"
                          placeholder="Your company name"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          Email (for order tracking)
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contactNumber" className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          Contact Number (Optional)
                        </Label>
                        <Input
                          id="contactNumber"
                          type="tel"
                          placeholder="+65 6555 1234"
                          value={contactNumber}
                          onChange={(e) => setContactNumber(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deliveryAddress" className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        Delivery Address <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="deliveryAddress"
                        placeholder="Enter full delivery address including street, city, state, and zip code"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="min-h-[100px]"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deliveryDate" className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        Preferred Delivery Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="deliveryDate"
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes" className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        Order Notes (Optional)
                      </Label>
                      <Textarea
                        id="notes"
                        placeholder="Any special instructions or requirements"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <Card className="sticky top-24 shadow-md border-0">
                  <CardHeader className="bg-gray-50 border-b">
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      {cart.map((item) => (
                        <div key={item.sku} className="flex justify-between text-sm">
                          <span className="text-gray-600 truncate max-w-[60%]">
                            {item.name} × {item.quantity}
                          </span>
                          <span className="font-medium">
                            ${(item.unitPrice * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">${cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax</span>
                      <span className="font-medium">$0.00</span>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between text-lg">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-orange-600">${cartTotal.toFixed(2)}</span>
                    </div>

                    <Button 
                      type="submit"
                      className="w-full h-12 text-base bg-orange-500 hover:bg-orange-600"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Place Order
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-gray-500 text-center">
                      By placing this order, you agree to our terms and conditions
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
