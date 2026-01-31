import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Package, Search, ShoppingCart, User, Menu, X, Phone, Truck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/_core/hooks/useAuth";

interface HeaderProps {
  cartItemCount?: number;
  onSearch?: (query: string) => void;
  onCartClick?: () => void;
}

export function Header({ cartItemCount = 0, onSearch, onCartClick }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (onSearch) {
        onSearch(searchQuery);
      } else {
        // Default: navigate to assistant with query
        setLocation(`/assistant?q=${encodeURIComponent(searchQuery)}`);
      }
    }
  };

  const navLinks = [
    { href: "/catalog", label: "All Products" },
    { href: "/track-order", label: "Track Orders" },
    { href: "/assistant", label: "AI Assistant" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Top Announcement Bar */}
      <div className="bg-[#1e3a5f] text-white text-sm">
        <div className="container flex items-center justify-between py-2">
          <p className="hidden md:block">
            Welcome to UnidBox Hardware - Your One-Stop Hardware & Home Essentials
          </p>
          <p className="md:hidden text-xs">Welcome to UnidBox Hardware</p>
          <div className="flex items-center gap-4">
            <a href="tel:+6565551234" className="flex items-center gap-1.5 hover:text-orange-400 transition-colors">
              <Phone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Contact Sales</span>
            </a>
            <span className="text-white/50">|</span>
            <div className="flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-orange-400" />
              <span>Free Delivery on Bulk Orders</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="container flex items-center justify-between gap-4 py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-500 rounded-lg flex items-center justify-center shadow-md">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-gray-900 leading-tight">UnidBox</h1>
              <p className="text-xs text-gray-500 -mt-0.5">Hardware</p>
            </div>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search products or ask AI for help..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 h-11 w-full rounded-full border-gray-300 focus:border-orange-400 focus:ring-orange-400"
              />
            </div>
          </form>

          {/* Right Icons */}
          <div className="flex items-center gap-2">
            {/* Cart */}
            {onCartClick ? (
              <Button variant="ghost" size="icon" className="relative" onClick={onCartClick}>
                <ShoppingCart className="h-5 w-5 text-gray-700" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {cartItemCount > 99 ? "99+" : cartItemCount}
                  </span>
                )}
              </Button>
            ) : (
              <Link href="/order">
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCart className="h-5 w-5 text-gray-700" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {cartItemCount > 99 ? "99+" : cartItemCount}
                    </span>
                  )}
                </Button>
              </Link>
            )}

            {/* Account Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="flex items-center gap-1">
                  <User className="h-5 w-5 text-gray-700" />
                  <ChevronDown className="h-3 w-3 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {isAuthenticated ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="w-full cursor-pointer">
                        Staff Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => logout()} className="cursor-pointer">
                      Sign Out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/track-order" className="w-full cursor-pointer">
                        Track My Order
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/staff/login" className="w-full cursor-pointer">
                        Staff Login
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5 text-gray-700" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <nav className="flex flex-col gap-4 mt-8">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-lg font-medium text-gray-700 hover:text-orange-500 transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <hr className="my-2" />
                  <Link
                    href="/staff/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-lg font-medium text-gray-700 hover:text-orange-500 transition-colors"
                  >
                    Staff Portal
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>

            {/* Desktop Menu Button */}
            <Button variant="ghost" size="icon" className="hidden md:flex">
              <Menu className="h-5 w-5 text-gray-700" />
            </Button>
          </div>
        </div>
      </div>

      {/* Category Navigation Bar (optional) */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white hidden md:block">
        <div className="container">
          <nav className="flex items-center gap-6 py-2 text-sm">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-orange-400 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;
