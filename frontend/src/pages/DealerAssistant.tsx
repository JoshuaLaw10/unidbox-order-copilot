import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { 
  Package, ArrowLeft, ShoppingCart, Plus, Minus, 
  Loader2, Sparkles, Send, User, Trash2, ArrowRight,
  MessageSquare, X, CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

type CartItem = {
  sku: string;
  name: string;
  unitPrice: number;
  unit: string;
  quantity: number;
  stockQuantity: number;
  leadTimeDays: number;
};

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

type QuickAction = {
  label: string;
  action: () => void;
  variant?: "default" | "outline" | "destructive";
};

export default function DealerAssistant() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = sessionStorage.getItem('dealerCart');
    return saved ? JSON.parse(saved) : [];
  });
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);

  // Fetch dealer profile
  const { data: profile } = trpc.dealer.profile.useQuery(undefined, {
    enabled: !!user && user.role === 'dealer',
  });

  // Fetch all products for context
  const { data: products } = trpc.products.list.useQuery();

  // Chat mutation
  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (response) => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: response.message,
      }]);
      
      // Process any cart updates from AI
      if (response.cartUpdates && response.cartUpdates.length > 0) {
        response.cartUpdates.forEach((update: any) => {
          if (update.action === 'add' && update.product) {
            addToCart(update.product, update.quantity || 1);
          } else if (update.action === 'remove' && update.sku) {
            removeFromCart(update.sku);
          } else if (update.action === 'clear') {
            clearCart();
          }
        });
      }

      // Set quick actions based on context
      updateQuickActions(response.suggestedActions);
      setIsProcessing(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to get response");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I'm sorry, I encountered an error. Please try again.",
      }]);
      setIsProcessing(false);
    },
  });

  // Save cart to session storage
  useEffect(() => {
    sessionStorage.setItem('dealerCart', JSON.stringify(cart));
  }, [cart]);

  // Check for initial message from search bar
  useEffect(() => {
    const initialMessage = sessionStorage.getItem('chatInitialMessage');
    if (initialMessage) {
      sessionStorage.removeItem('chatInitialMessage');
      // Send the initial message
      handleSendMessage(initialMessage);
    }
  }, []);

  // Initialize with system context
  useEffect(() => {
    if (products && messages.length === 0) {
      const systemMessage: Message = {
        role: "system",
        content: `You are a helpful wholesale ordering assistant for UnidBox. You help dealers:
1. Find products and check pricing/availability
2. Build orders from natural language requests
3. Answer questions about products, stock, and delivery

Available products: ${products.map(p => `${p.name} (SKU: ${p.sku}, $${p.unitPrice}/${p.unit}, ${p.stockQuantity} in stock, ${p.leadTimeDays}d lead time)`).join('; ')}

When a dealer asks to order products, extract:
- Product names/SKUs
- Quantities
- Delivery date (if mentioned)
- Delivery location (if mentioned)

Always confirm what you understood and offer to add items to their cart.
Be concise and helpful. Use markdown for formatting.`
      };
      setMessages([systemMessage]);
    }
  }, [products]);

  const addToCart = (product: any, quantity: number = 1) => {
    setCart(prev => {
      const existing = prev.find(c => c.sku === product.sku);
      if (existing) {
        return prev.map(c => 
          c.sku === product.sku 
            ? { ...c, quantity: c.quantity + quantity }
            : c
        );
      }
      return [...prev, {
        sku: product.sku,
        name: product.name,
        unitPrice: parseFloat(product.unitPrice),
        unit: product.unit,
        quantity,
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

  const updateQuickActions = (suggested?: string[]) => {
    const actions: QuickAction[] = [];
    
    if (cart.length > 0) {
      actions.push({
        label: "Proceed to Order",
        action: () => setLocation("/dealer/order"),
        variant: "default",
      });
      actions.push({
        label: "Clear Cart",
        action: clearCart,
        variant: "outline",
      });
    }
    
    actions.push({
      label: "Browse Catalog",
      action: () => setLocation("/dealer"),
      variant: "outline",
    });
    
    setQuickActions(actions);
  };

  const handleSendMessage = (content: string) => {
    if (!content.trim() || isProcessing) return;

    const userMessage: Message = { role: "user", content: content.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);

    // Build context for the AI
    const cartContext = cart.length > 0 
      ? `\n\nCurrent cart: ${cart.map(item => `${item.quantity}x ${item.name}`).join(', ')} (Total: $${cartTotal.toFixed(2)})`
      : '\n\nCart is empty.';

    chatMutation.mutate({
      messages: [...messages, userMessage],
      context: {
        dealerName: profile?.name || user?.name || 'Dealer',
        cartItems: cart,
        cartTotal,
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Display messages (filter out system)
  const displayMessages = messages.filter(m => m.role !== "system");

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
    <div className="min-h-screen bg-slate-50 flex flex-col">
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
            <Badge className="ml-2 bg-blue-100 text-blue-700">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Assistant
            </Badge>
          </div>
          <div className="ml-auto flex items-center gap-4">
            {cart.length > 0 && (
              <Button 
                variant="outline" 
                onClick={() => setLocation("/dealer/order")}
                className="relative"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Cart ({cart.length})
              </Button>
            )}
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-900">{profile?.name || user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container py-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat Area */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-sm h-[calc(100vh-180px)] flex flex-col">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquare className="w-5 h-5" />
                    Wholesale Assistant
                  </CardTitle>
                </CardHeader>
                
                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {displayMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <Sparkles className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        How can I help you today?
                      </h3>
                      <p className="text-slate-500 mb-6 max-w-md">
                        I can help you find products, check pricing and availability, 
                        and build orders from natural language requests.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                        {[
                          "I need 50 LED panel lights",
                          "What's the price for safety helmets?",
                          "Check stock for shipping boxes",
                          "Order 100 packing tape rolls for next week",
                        ].map((prompt, i) => (
                          <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendMessage(prompt)}
                            disabled={isProcessing}
                          >
                            {prompt}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {displayMessages.map((message, index) => (
                        <div
                          key={index}
                          className={`flex gap-3 ${
                            message.role === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          {message.role === "assistant" && (
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <Sparkles className="w-4 h-4 text-blue-600" />
                            </div>
                          )}
                          <div
                            className={`max-w-[80%] rounded-lg px-4 py-3 ${
                              message.role === "user"
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-900"
                            }`}
                          >
                            {message.role === "assistant" ? (
                              <div className="prose prose-sm max-w-none">
                                <Streamdown>{message.content}</Streamdown>
                              </div>
                            ) : (
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            )}
                          </div>
                          {message.role === "user" && (
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-slate-600" />
                            </div>
                          )}
                        </div>
                      ))}
                      {isProcessing && (
                        <div className="flex gap-3 justify-start">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="bg-slate-100 rounded-lg px-4 py-3">
                            <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>

                {/* Quick Actions */}
                {quickActions.length > 0 && (
                  <div className="px-4 py-2 border-t bg-slate-50 flex gap-2 flex-wrap">
                    {quickActions.map((action, i) => (
                      <Button
                        key={i}
                        variant={action.variant || "outline"}
                        size="sm"
                        onClick={action.action}
                        className={action.variant === "default" ? "bg-blue-600 hover:bg-blue-700" : ""}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Input */}
                <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about products, pricing, or place an order..."
                    className="flex-1 min-h-[44px] max-h-32 resize-none"
                    rows={1}
                  />
                  <Button
                    type="submit"
                    disabled={!input.trim() || isProcessing}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </Card>
            </div>

            {/* Cart Sidebar */}
            <div className="lg:col-span-1">
              <Card className="border-0 shadow-sm sticky top-24">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <ShoppingCart className="w-4 h-4" />
                    Order Draft ({cart.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {cart.length === 0 ? (
                    <div className="p-6 text-center">
                      <ShoppingCart className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">
                        Your cart is empty. Ask me to add products!
                      </p>
                    </div>
                  ) : (
                    <>
                      <ScrollArea className="max-h-[300px]">
                        <div className="p-4 space-y-3">
                          {cart.map(item => (
                            <div key={item.sku} className="flex gap-2 p-2 bg-slate-50 rounded-lg">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.name}</p>
                                <p className="text-xs text-slate-500">${item.unitPrice.toFixed(2)} × {item.quantity}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => updateCartQuantity(item.sku, item.quantity - 1)}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="text-sm w-6 text-center">{item.quantity}</span>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => updateCartQuantity(item.sku, item.quantity + 1)}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-6 w-6 text-slate-400 hover:text-red-500"
                                  onClick={() => removeFromCart(item.sku)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <div className="p-4 border-t space-y-3">
                        <div className="flex justify-between font-medium">
                          <span>Subtotal</span>
                          <span className="text-blue-600">${cartTotal.toFixed(2)}</span>
                        </div>
                        <Button 
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          onClick={() => setLocation("/dealer/order")}
                        >
                          Proceed to Order
                          <ArrowRight className="w-4 h-4 ml-2" />
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
                </CardContent>
              </Card>

              {/* Help Card */}
              <Card className="border-0 shadow-sm mt-4">
                <CardContent className="p-4">
                  <h4 className="font-medium text-sm mb-2">Try asking:</h4>
                  <ul className="text-xs text-slate-500 space-y-1">
                    <li>• "I need 50 LED lights and 100 boxes"</li>
                    <li>• "What's the price for safety vests?"</li>
                    <li>• "Check availability for packing tape"</li>
                    <li>• "Add 20 helmets to my order"</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
