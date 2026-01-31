import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { 
  Package, 
  Search, 
  FileText, 
  Truck, 
  ShoppingCart,
  MessageSquare,
  ArrowRight,
  Sparkles,
  Clock,
  CheckCircle2,
  User,
  Zap,
  Shield,
  DollarSign
} from "lucide-react";

export default function Home() {
  const [, navigate] = useLocation();
  const [inquiry, setInquiry] = useState("");
  const [dealerName, setDealerName] = useState("");
  const [dealerEmail, setDealerEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitInquiry = trpc.inquiries.submit.useMutation({
    onSuccess: (data) => {
      toast.success("Inquiry submitted! AI is processing your request...");
      navigate(`/inquiry/${data.inquiryId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit inquiry");
      setIsSubmitting(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiry.trim()) {
      toast.error("Please enter your inquiry");
      return;
    }
    if (!dealerName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!dealerEmail.trim()) {
      toast.error("Please enter your email");
      return;
    }
    setIsSubmitting(true);
    submitInquiry.mutate({
      rawInquiry: inquiry,
      dealerName,
      dealerEmail,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#1e3a5f] via-[#2d4a6f] to-[#1e3a5f] text-white py-16">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-white/20">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-medium">AI-Powered Wholesale Ordering</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
              Order Wholesale Products
              <span className="text-orange-400 block sm:inline"> Effortlessly</span>
            </h1>
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
              Simply describe what you need in plain English. Our AI will parse your request, 
              check availability, and provide instant pricing.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 container py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Inquiry Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-orange-500" />
                  </div>
                  Submit Your Inquiry
                </CardTitle>
                <CardDescription>
                  Describe your order in natural language - our AI will handle the rest
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dealerName" className="font-medium text-gray-700">Your Name / Company</Label>
                      <Input
                        id="dealerName"
                        placeholder="e.g., John Smith or ABC Trading Co."
                        value={dealerName}
                        onChange={(e) => setDealerName(e.target.value)}
                        className="h-11 border-gray-300 focus:border-orange-400 focus:ring-orange-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dealerEmail" className="font-medium text-gray-700">Email Address</Label>
                      <Input
                        id="dealerEmail"
                        type="email"
                        placeholder="your@email.com"
                        value={dealerEmail}
                        onChange={(e) => setDealerEmail(e.target.value)}
                        className="h-11 border-gray-300 focus:border-orange-400 focus:ring-orange-400"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="inquiry" className="font-medium text-gray-700">Your Order Request</Label>
                    <Textarea
                      id="inquiry"
                      placeholder="Example: I need 50 LED panel lights and 200 shipping boxes. Delivery to our warehouse at 123 Industrial Ave by next Friday. Also include 100 safety helmets if available."
                      value={inquiry}
                      onChange={(e) => setInquiry(e.target.value)}
                      rows={6}
                      className="border-gray-300 focus:border-orange-400 focus:ring-orange-400 resize-none"
                    />
                    <p className="text-xs text-gray-500">
                      Include product names, quantities, delivery address, and preferred date
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-base py-6 shadow-lg shadow-orange-500/25"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        Processing with AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Submit Inquiry
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* How It Works */}
            <div className="mt-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">How It Works</h2>
              <div className="grid sm:grid-cols-3 gap-5">
                <Card className="shadow-md border-0 hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="w-7 h-7 text-orange-500" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">1. Describe Your Order</h3>
                    <p className="text-sm text-gray-500">
                      Write your request in plain English
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-md border-0 hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-7 h-7 text-blue-500" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">2. AI Processes</h3>
                    <p className="text-sm text-gray-500">
                      Get instant pricing & availability
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-md border-0 hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-7 h-7 text-green-500" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">3. Confirm & Order</h3>
                    <p className="text-sm text-gray-500">
                      Review, confirm, and get your DO
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="shadow-lg border-0">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg text-gray-900">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <Link href="/catalog">
                  <Button variant="outline" className="w-full justify-start h-11 border-gray-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200">
                    <ShoppingCart className="w-4 h-4 mr-3" />
                    Browse Product Catalog
                  </Button>
                </Link>
                <Link href="/track-order">
                  <Button variant="outline" className="w-full justify-start h-11 border-gray-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200">
                    <Search className="w-4 h-4 mr-3" />
                    Track Your Order
                  </Button>
                </Link>
                <Link href="/assistant">
                  <Button variant="outline" className="w-full justify-start h-11 border-gray-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200">
                    <MessageSquare className="w-4 h-4 mr-3" />
                    Chat with AI Assistant
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Features */}
            <Card className="shadow-lg border-0">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg text-gray-900">Why UnidBox?</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">No Account Required</h4>
                    <p className="text-xs text-gray-500">Order instantly without registration</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">AI-Powered Parsing</h4>
                    <p className="text-xs text-gray-500">Natural language order processing</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                    <DollarSign className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">Instant Pricing</h4>
                    <p className="text-xs text-gray-500">Real-time availability & quotes</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                    <Truck className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">Fast Delivery</h4>
                    <p className="text-xs text-gray-500">Quick turnaround on all orders</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Need Help */}
            <Card className="shadow-lg border-0 bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f] text-white">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Need Help?</h3>
                <p className="text-sm text-white/80 mb-4">
                  Our team is here to assist with bulk orders and special requests.
                </p>
                <Link href="/assistant">
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Chat with AI Assistant
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
