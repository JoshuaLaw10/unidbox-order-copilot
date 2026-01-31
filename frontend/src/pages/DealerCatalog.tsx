import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Package, LogOut, Search, ShoppingCart, Plus, Minus, 
  Loader2, Clock, CheckCircle, Sparkles, Filter, X,
  Building2, FileText, Truck, AlertCircle, MessageSquare,
  ArrowRight, Trash2
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

// Export cart context for other components
export const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = sessionStorage.getItem('dealerCart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    sessionStorage.setItem('dealerCart', JSON.stringify(cart));
  }, [cart]);

  return { cart, setCart };
};

export default function DealerCatalog() {
  const [, setLocation] = useLocation();
  const { user, logout, loading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = sessionStorage.getItem('dealerCart');
    return saved ? JSON.parse(saved) : [];
  });
  const [isAIParsing, setIsAIParsing] = useState(false);
  const [aiHighlightedSkus, setAiHighlightedSkus] = useState<Set<string>>(new Set());
  const [cartOpen, setCartOpen] = useState(false);
  const [showChatPrompt, setShowChatPrompt] = useState(false);

  // Save cart to session storage
  useEffect(() => {
    sessionStorage.setItem('dealerCart', JSON.stringify(cart));
  }, [cart]);

  // Fetch dealer profile
  const { data: profile } = trpc.dealer.profile.useQuery(undefined, {
    enabled: !!user && user.role === 'dealer',
  });

  // Fetch all products
  const { data: products, isLoading: productsLoading } = trpc.products.list.useQuery();

  // Get unique categories
  const categories = useMemo(() => {
    if (!products) return [];
    const cats = Array.from(new Set(products.map(p => p.category)));
    return cats.sort();
  }, [products]);

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let filtered = products;
    
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    if (searchQuery && !showChatPrompt) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [products, searchQuery, selectedCategory, showChatPrompt]);

  // Detect if search looks like natural language inquiry
  const isNaturalLanguageQuery = (text: string) => {
    if (text.length < 15) return false;
    const words = text.trim().split(/\s+/);
    if (words.length < 3) return false;
    
    // Check for inquiry-like patterns
    const inquiryPatterns = [
      /need\s+\d+/i,
      /want\s+\d+/i,
      /order\s+\d+/i,
      /\d+\s+(boxes|cartons|pcs|units|pieces)/i,
      /deliver(y)?\s+(to|by)/i,
      /next\s+(week|friday|monday|tuesday|wednesday|thursday|saturday|sunday)/i,
      /can\s+(i|you)/i,
      /how\s+much/i,
      /price\s+(for|of)/i,
      /available/i,
      /in\s+stock/i,
    ];
    
    return inquiryPatterns.some(pattern => pattern.test(text));
  };

  // Handle search input
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    
    if (isNaturalLanguageQuery(value)) {
      setShowChatPrompt(true);
    } else {
      setShowChatPrompt(false);
    }
  };

  // Open chat with query
  const openChatWithQuery = () => {
    sessionStorage.setItem('chatInitialMessage', searchQuery);
    setLocation("/dealer/assistant");
  };

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(c => c.sku === product.sku);
      if (existing) {
        return prev.map(c => 
          c.sku === product.sku 
            ? { ...c, quantity: c.quantity + 1 }
            : c
        );
      }
      return [...prev, {
        sku: product.sku,
        name: product.name,
        unitPrice: parseFloat(product.unitPrice),
        unit: product.unit,
        quantity: 1,
        stockQuantity: product.stockQuantity,
        leadTimeDays: product.leadTimeDays,
      }];
    });
    toast.success(`Added ${product.name} to cart`);
  };

  const updateCartQuantity = (sku: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(sku);
      return;
    }
    setCart(prev => prev.map(item => 
      item.sku === sku ? { ...item, quantity: newQty } : item
    ));
  };

  const removeFromCart = (sku: string) => {
    setCart(prev => prev.filter(item => item.sku !== sku));
    toast.info("Item removed from cart");
  };

  const clearCart = () => {
    setCart([]);
    toast.info("Cart cleared");
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  }, [cart]);

  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const handleLogout = async () => {
    await logout();
    sessionStorage.removeItem('dealerCart');
    setLocation("/login");
  };

  const proceedToOrder = () => {
    setCartOpen(false);
    setLocation("/dealer/order");
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

  const getStockStatus = (qty: number) => {
    if (qty > 100) return { label: "In Stock", color: "text-green-600 bg-green-50" };
    if (qty > 20) return { label: "Low Stock", color: "text-yellow-600 bg-yellow-50" };
    if (qty > 0) return { label: "Limited", color: "text-orange-600 bg-orange-50" };
    return { label: "Out of Stock", color: "text-red-600 bg-red-50" };
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="border-b bg-white shadow-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <a href="/dealer" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-slate-900">UnidBox</span>
            <Badge variant="outline" className="ml-2 text-blue-600 border-blue-200">Dealer</Badge>
          </a>
          
          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search products or ask AI (e.g. 'need 200 cartons delivered next Friday')"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-10 h-11 bg-slate-50 border-slate-200 focus:bg-white"
              />
              {showChatPrompt && (
                <Button
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700"
                  onClick={openChatWithQuery}
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Ask AI
                </Button>
              )}
            </div>
            {showChatPrompt && (
              <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                This looks like an order request. Click "Ask AI" to chat with our assistant.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Chat Assistant Button */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation("/dealer/assistant")}
              className="hidden sm:flex"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat Assistant
            </Button>

            {/* Cart Drawer */}
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="relative">
                  <ShoppingCart className="w-5 h-5" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                      {cartItemCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-lg flex flex-col">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Order Cart ({cart.length} items)
                  </SheetTitle>
                </SheetHeader>
                
                {cart.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                    <ShoppingCart className="w-16 h-16 text-slate-200 mb-4" />
                    <p className="text-slate-500 font-medium">Your cart is empty</p>
                    <p className="text-sm text-slate-400 mt-1">Add products to start your order</p>
                  </div>
                ) : (
                  <>
                    <ScrollArea className="flex-1 -mx-6 px-6">
                      <div className="space-y-4 py-4">
                        {cart.map(item => (
                          <div key={item.sku} className="flex gap-4 p-3 bg-slate-50 rounded-lg">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.name}</p>
                              <p className="text-xs text-slate-500">SKU: {item.sku}</p>
                              <p className="text-sm font-medium text-blue-600 mt-1">
                                ${item.unitPrice.toFixed(2)} / {item.unit}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="flex items-center gap-1">
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateCartQuantity(item.sku, item.quantity - 1)}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateCartQuantity(item.sku, parseInt(e.target.value) || 0)}
                                  className="w-16 h-7 text-center text-sm"
                                />
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateCartQuantity(item.sku, item.quantity + 1)}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                              <p className="text-sm font-semibold">
                                ${(item.unitPrice * item.quantity).toFixed(2)}
                              </p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-7 w-7 text-slate-400 hover:text-red-500"
                              onClick={() => removeFromCart(item.sku)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    
                    <div className="border-t pt-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Subtotal</span>
                        <span className="text-xl font-bold">${cartTotal.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Tax and delivery fees calculated at checkout
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={clearCart}>
                          Clear Cart
                        </Button>
                        <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={proceedToOrder}>
                          Proceed to Order
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </SheetContent>
            </Sheet>

            {/* Navigation */}
            <Button variant="ghost" size="sm" onClick={() => setLocation("/dealer/orders")}>
              <FileText className="w-4 h-4 mr-2" />
              My Orders
            </Button>

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
      <main className="flex-1 container py-6">
        <div className="flex gap-6">
          {/* Sidebar - Categories */}
          <div className="w-64 flex-shrink-0">
            <Card className="border-0 shadow-sm sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    !selectedCategory ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-slate-100'
                  }`}
                >
                  All Products
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory === cat ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-0 shadow-sm mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setLocation("/dealer/assistant")}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Chat with AI Assistant
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setLocation("/dealer/orders")}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View My Orders
                </Button>
              </CardContent>
            </Card>

            {/* Cart Summary (when items in cart) */}
            {cart.length > 0 && (
              <Card className="border-0 shadow-sm mt-4 bg-blue-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700">
                    <ShoppingCart className="w-4 h-4" />
                    Cart Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Items</span>
                    <span className="font-medium">{cartItemCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-bold text-blue-700">${cartTotal.toFixed(2)}</span>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700" 
                    onClick={proceedToOrder}
                  >
                    Proceed to Order
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>

          {/* Product Grid */}
          <div className="flex-1">
            {productsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {selectedCategory || 'All Products'}
                    <span className="text-sm font-normal text-slate-500 ml-2">
                      ({filteredProducts.length} products)
                    </span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProducts.map(product => {
                    const stockStatus = getStockStatus(product.stockQuantity);
                    const cartItem = cart.find(c => c.sku === product.sku);
                    
                    return (
                      <Card 
                        key={product.id} 
                        className="border-0 shadow-sm hover:shadow-md transition-all"
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base line-clamp-2">{product.name}</CardTitle>
                              <p className="text-xs text-slate-500 mt-1">SKU: {product.sku}</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pb-3">
                          <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-2xl font-bold text-slate-900">
                              ${parseFloat(product.unitPrice).toFixed(2)}
                            </span>
                            <span className="text-sm text-slate-500">/{product.unit}</span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm">
                            <Badge variant="outline" className={stockStatus.color}>
                              {stockStatus.label}
                            </Badge>
                            <span className="text-slate-500 flex items-center gap-1">
                              <Truck className="w-3 h-3" />
                              {product.leadTimeDays}d lead
                            </span>
                          </div>
                          
                          <p className="text-xs text-slate-500 mt-2">
                            Min order: {product.minOrderQuantity} {product.unit}
                          </p>
                        </CardContent>
                        <CardFooter className="pt-0">
                          {cartItem ? (
                            <div className="flex items-center gap-2 w-full">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => updateCartQuantity(product.sku, cartItem.quantity - 1)}
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <Input
                                type="number"
                                value={cartItem.quantity}
                                onChange={(e) => updateCartQuantity(product.sku, parseInt(e.target.value) || 0)}
                                className="flex-1 text-center h-9"
                              />
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => updateCartQuantity(product.sku, cartItem.quantity + 1)}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => removeFromCart(product.sku)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              className="w-full bg-blue-600 hover:bg-blue-700"
                              onClick={() => addToCart(product)}
                              disabled={product.stockQuantity === 0}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add to Cart
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>

                {filteredProducts.length === 0 && (
                  <Card className="border-0 shadow-sm">
                    <CardContent className="py-12 text-center">
                      <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                      <p className="text-slate-500">No products found</p>
                      <p className="text-sm text-slate-400">Try adjusting your search or filters</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Floating Cart Button (Mobile) */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 right-6 sm:hidden">
          <Button 
            size="lg"
            className="rounded-full w-16 h-16 bg-blue-600 hover:bg-blue-700 shadow-lg"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingCart className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {cartItemCount}
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}
