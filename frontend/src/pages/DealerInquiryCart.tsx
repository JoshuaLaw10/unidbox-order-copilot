import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Package, ArrowLeft, Trash2, Plus, Minus, 
  Loader2, Send, Calendar, MapPin, FileText
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type CartItem = {
  sku: string;
  name: string;
  unitPrice: number;
  unit: string;
  quantity: number;
  stockQuantity: number;
  leadTimeDays: number;
};

export default function DealerInquiryCart() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch dealer profile
  const { data: profile } = trpc.dealer.profile.useQuery(undefined, {
    enabled: !!user && user.role === 'dealer',
  });

  // Load cart from session storage
  useEffect(() => {
    const savedCart = sessionStorage.getItem('inquiryCart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse cart:', e);
      }
    }
    
    // Set default delivery address from profile
    if (profile?.address) {
      setDeliveryAddress(profile.address);
    }
  }, [profile]);

  // Save cart changes back to session storage
  useEffect(() => {
    sessionStorage.setItem('inquiryCart', JSON.stringify(cart));
  }, [cart]);

  const submitInquiry = trpc.inquiries.submit.useMutation({
    onSuccess: (data) => {
      sessionStorage.removeItem('inquiryCart');
      toast.success("Inquiry submitted successfully!");
      setLocation(`/inquiry/${data.inquiryId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit inquiry");
    },
  });

  const updateQuantity = (sku: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.sku === sku) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const setQuantity = (sku: string, quantity: number) => {
    setCart(prev => prev.map(item => {
      if (item.sku === sku) {
        return { ...item, quantity: Math.max(1, quantity) };
      }
      return item;
    }));
  };

  const removeItem = (sku: string) => {
    setCart(prev => prev.filter(item => item.sku !== sku));
    toast.info("Item removed from cart");
  };

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  }, [cart]);

  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const maxLeadTime = useMemo(() => {
    return Math.max(...cart.map(item => item.leadTimeDays), 0);
  }, [cart]);

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setIsSubmitting(true);
    
    // Build a natural language inquiry from cart items
    const itemDescriptions = cart.map(item => 
      `${item.quantity} ${item.unit} of ${item.name} (SKU: ${item.sku})`
    ).join(", ");
    
    let rawInquiry = `I would like to order: ${itemDescriptions}.`;
    if (deliveryDate) {
      rawInquiry += ` Requested delivery date: ${deliveryDate}.`;
    }
    if (deliveryAddress) {
      rawInquiry += ` Delivery address: ${deliveryAddress}.`;
    }
    if (notes) {
      rawInquiry += ` Additional notes: ${notes}`;
    }

    try {
      await submitInquiry.mutateAsync({
        rawInquiry,
        dealerName: profile?.name,
        dealerEmail: profile?.email || undefined,
        dealerPhone: profile?.phone || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
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
            </div>
          </div>
          <Badge variant="outline" className="text-blue-600 border-blue-200">
            <FileText className="w-3 h-3 mr-1" />
            Review Inquiry
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">Review Your Inquiry</h1>

          {cart.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">Your cart is empty</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setLocation("/dealer")}
                >
                  Browse Products
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle>Items ({cart.length})</CardTitle>
                    <CardDescription>Review and adjust quantities</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {cart.map(item => (
                      <div key={item.sku} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900">{item.name}</h4>
                          <p className="text-sm text-slate-500">SKU: {item.sku}</p>
                          <p className="text-sm text-slate-500">
                            ${item.unitPrice.toFixed(2)} / {item.unit}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.sku, -1)}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => setQuantity(item.sku, parseInt(e.target.value) || 1)}
                            className="w-20 text-center h-8"
                            min={1}
                          />
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.sku, 1)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="text-right w-24">
                          <p className="font-semibold text-slate-900">
                            ${(item.unitPrice * item.quantity).toFixed(2)}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => removeItem(item.sku)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Delivery Details */}
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle>Delivery Details</CardTitle>
                    <CardDescription>Optional delivery preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="deliveryDate" className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Requested Delivery Date
                        </Label>
                        <Input
                          id="deliveryDate"
                          type="date"
                          value={deliveryDate}
                          onChange={(e) => setDeliveryDate(e.target.value)}
                          min={format(new Date(Date.now() + maxLeadTime * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')}
                        />
                        <p className="text-xs text-slate-500">
                          Minimum lead time: {maxLeadTime} days
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="deliveryAddress" className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Delivery Address
                        </Label>
                        <Input
                          id="deliveryAddress"
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="Enter delivery address"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Additional Notes</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any special instructions or requirements..."
                        rows={3}
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
                      <div className="border-t pt-2">
                        <div className="flex justify-between font-semibold text-lg">
                          <span>Total</span>
                          <span className="text-blue-600">${total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {profile && (
                      <div className="p-3 bg-slate-50 rounded-lg text-sm">
                        <p className="font-medium text-slate-900">{profile.name}</p>
                        <p className="text-slate-600">{profile.email}</p>
                        {profile.phone && <p className="text-slate-600">{profile.phone}</p>}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex-col gap-3">
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={handleSubmit}
                      disabled={isSubmitting || cart.length === 0}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Submit Inquiry
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-slate-500 text-center">
                      Your inquiry will be processed by our AI and you'll receive pricing shortly
                    </p>
                  </CardFooter>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
