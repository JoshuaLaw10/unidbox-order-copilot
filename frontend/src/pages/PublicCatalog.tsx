import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { 
  Package, Search, ShoppingCart, Plus, Minus, 
  Loader2, Clock, Sparkles, X,
  MessageSquare, ArrowRight, Trash2, Zap
} from "lucide-react";
import { toast } from "sonner";
import { nanoid } from "nanoid";

type CartItem = {
  sku: string;
  name: string;
  unitPrice: number;
  unit: string;
  quantity: number;
  stockQuantity: number;
  leadTimeDays: number;
};

// Generate or retrieve session ID for anonymous orders
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('publicSessionId');
  if (!sessionId) {
    sessionId = nanoid(16);
    sessionStorage.setItem('publicSessionId', sessionId);
  }
  return sessionId;
};

export default function PublicCatalog() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = sessionStorage.getItem('publicCart');
    return saved ? JSON.parse(saved) : [];
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [showChatPrompt, setShowChatPrompt] = useState(false);

  // Initialize session ID
  useEffect(() => {
    getSessionId();
  }, []);

  // Save cart to session storage
  useEffect(() => {
    sessionStorage.setItem('publicCart', JSON.stringify(cart));
  }, [cart]);

  // Fetch all products (public API)
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
    setShowChatPrompt(isNaturalLanguageQuery(value));
  };

  // Open chat with query
  const openChatWithQuery = () => {
    sessionStorage.setItem('chatInitialMessage', searchQuery);
    setLocation("/assistant");
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

  const proceedToOrder = () => {
    setCartOpen(false);
    setLocation("/order");
  };

  const getStockStatus = (qty: number) => {
    if (qty > 100) return { label: "In Stock", color: "text-green-600 bg-green-50" };
    if (qty > 20) return { label: "Low Stock", color: "text-yellow-600 bg-yellow-50" };
    if (qty > 0) return { label: "Limited", color: "text-orange-600 bg-orange-50" };
    return { label: "Out of Stock", color: "text-red-600 bg-red-50" };
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header cartItemCount={cartItemCount} onCartClick={() => setCartOpen(true)} />

      {/* Main Content */}
      <main className="flex-1 container py-6">
        <div className="flex gap-6">
          {/* Sidebar - Categories */}
          <aside className="w-64 shrink-0 hidden lg:block">
            <Card className="sticky top-24 shadow-md border-0">
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-500" />
                  Categories
                </h3>
                <div className="space-y-1">
                  <Button
                    variant={selectedCategory === null ? "secondary" : "ghost"}
                    className={`w-full justify-start ${selectedCategory === null ? 'bg-orange-100 text-orange-700' : ''}`}
                    onClick={() => setSelectedCategory(null)}
                  >
                    All Products
                    <Badge variant="outline" className="ml-auto">{products?.length || 0}</Badge>
                  </Button>
                  {categories.map(cat => (
                    <Button
                      key={cat}
                      variant={selectedCategory === cat ? "secondary" : "ghost"}
                      className={`w-full justify-start ${selectedCategory === cat ? 'bg-orange-100 text-orange-700' : ''}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                      <Badge variant="outline" className="ml-auto">
                        {products?.filter(p => p.category === cat).length || 0}
                      </Badge>
                    </Button>
                  ))}
                </div>

                <Separator className="my-4" />

                {/* Quick Actions */}
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start text-orange-600 border-orange-200 hover:bg-orange-50"
                    onClick={() => setLocation("/assistant")}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Chat with AI Assistant
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setLocation("/")}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Submit Inquiry
                  </Button>
                </div>

                {/* Cart Summary */}
                {cart.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <div className="bg-orange-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-orange-500" />
                        Cart Summary
                      </h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Items</span>
                          <span className="font-medium">{cartItemCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Subtotal</span>
                          <span className="font-bold text-orange-600">${cartTotal.toFixed(2)}</span>
                        </div>
                      </div>
                      <Button 
                        className="w-full mt-3 bg-orange-500 hover:bg-orange-600"
                        onClick={proceedToOrder}
                      >
                        Proceed to Order
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search products or type your inquiry..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 pr-10 h-12 bg-white border-gray-200 focus:border-orange-400 focus:ring-orange-400"
                />
                {showChatPrompt && (
                  <Button
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-orange-500 hover:bg-orange-600"
                    onClick={openChatWithQuery}
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Ask AI
                  </Button>
                )}
              </div>
              {showChatPrompt && (
                <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  This looks like an order request. Click "Ask AI" to chat with our assistant.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {selectedCategory || "All Products"}
                </h1>
                <p className="text-gray-500 text-sm">
                  {filteredProducts.length} products available
                </p>
              </div>
              
              {/* Mobile Category Filter */}
              <div className="lg:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Package className="w-4 h-4 mr-2" />
                      Categories
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left">
                    <SheetHeader>
                      <SheetTitle>Categories</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-2 mt-4">
                      <Button
                        variant={selectedCategory === null ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => setSelectedCategory(null)}
                      >
                        All Products
                      </Button>
                      {categories.map(cat => (
                        <Button
                          key={cat}
                          variant={selectedCategory === cat ? "secondary" : "ghost"}
                          className="w-full justify-start"
                          onClick={() => setSelectedCategory(cat)}
                        >
                          {cat}
                        </Button>
                      ))}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            {productsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20">
                <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-600">No products found</h3>
                <p className="text-gray-400">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product.stockQuantity);
                  const cartItem = cart.find(c => c.sku === product.sku);
                  
                  return (
                    <Card 
                      key={product.id} 
                      className="overflow-hidden hover:shadow-lg transition-shadow group border-0 shadow-md"
                    >
                      {/* Product Image */}
                      <div className="aspect-square bg-gray-100 relative overflow-hidden">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`absolute inset-0 flex items-center justify-center ${product.imageUrl ? 'hidden' : ''}`}>
                          <Package className="w-16 h-16 text-gray-300" />
                        </div>
                        <Badge 
                          variant="secondary" 
                          className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-xs"
                        >
                          {product.category}
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <div className="mb-2">
                          <h3 className="font-semibold text-gray-900 line-clamp-2">
                            {product.name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">SKU: {product.sku}</p>
                        </div>
                        
                        <div className="mt-3 space-y-2">
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-orange-600">
                              ${parseFloat(product.unitPrice).toFixed(2)}
                            </span>
                            <span className="text-sm text-gray-500">/{product.unit}</span>
                          </div>
                          
                          <div className="flex items-center gap-3 text-xs">
                            <Badge className={stockStatus.color} variant="secondary">
                              {stockStatus.label}
                            </Badge>
                            <span className="flex items-center gap-1 text-gray-500">
                              <Clock className="w-3 h-3" />
                              {product.leadTimeDays}d lead
                            </span>
                          </div>
                          
                          <p className="text-xs text-gray-500">
                            Min order: {product.minOrderQuantity} {product.unit}
                          </p>
                        </div>
                        
                        <div className="mt-4 flex items-center gap-2">
                          {cartItem ? (
                            <div className="flex items-center gap-2 flex-1">
                              <div className="flex items-center gap-1 bg-gray-100 rounded-md flex-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9"
                                  onClick={() => updateCartQuantity(product.sku, cartItem.quantity - 1)}
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                                <Input
                                  type="number"
                                  value={cartItem.quantity}
                                  onChange={(e) => updateCartQuantity(product.sku, parseInt(e.target.value) || 0)}
                                  className="w-16 h-9 text-center border-0 bg-transparent"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9"
                                  onClick={() => updateCartQuantity(product.sku, cartItem.quantity + 1)}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => removeFromCart(product.sku)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              className="flex-1 bg-orange-500 hover:bg-orange-600"
                              onClick={() => addToCart(product)}
                              disabled={product.stockQuantity === 0}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add to Cart
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Cart Drawer */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-orange-500" />
              Order Cart ({cart.length} items)
            </SheetTitle>
          </SheetHeader>
          
          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <ShoppingCart className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">Your cart is empty</p>
              <p className="text-sm">Add products to get started</p>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-4 py-4">
                  {cart.map((item) => (
                    <div key={item.sku} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.sku}</p>
                        <p className="text-sm font-semibold text-orange-600 mt-1">
                          ${item.unitPrice.toFixed(2)} / {item.unit}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-400 hover:text-red-500"
                          onClick={() => removeFromCart(item.sku)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <div className="flex items-center gap-1 bg-white rounded-md border">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateCartQuantity(item.sku, item.quantity - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateCartQuantity(item.sku, item.quantity + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-sm font-semibold">
                          ${(item.unitPrice * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <Separator className="my-4" />
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-xl font-bold text-orange-600">${cartTotal.toFixed(2)}</span>
                </div>
                <Button 
                  className="w-full h-12 text-base bg-orange-500 hover:bg-orange-600"
                  onClick={proceedToOrder}
                >
                  Proceed to Order
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={clearCart}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Cart
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Footer />
    </div>
  );
}
