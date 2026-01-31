import { Link } from "wouter";
import { Package, Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#1a2332] text-white">
      {/* Main Footer Content */}
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Company Info */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg">
                <Package className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">UnidBox</h3>
                <p className="text-sm text-gray-400">Hardware Pte. Ltd.</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Your one-stop solution for hardware & home essentials. Serving Singapore since 2015 with 5 outlets and a dedicated service centre.
            </p>
            <div className="space-y-3">
              <a href="mailto:sales@unidbox.com" className="flex items-center gap-3 text-gray-400 hover:text-orange-400 transition-colors text-sm">
                <Mail className="h-4 w-4 shrink-0" />
                <span>sales@unidbox.com</span>
              </a>
              <a href="tel:+6565551234" className="flex items-center gap-3 text-gray-400 hover:text-orange-400 transition-colors text-sm">
                <Phone className="h-4 w-4 shrink-0" />
                <span>+65 6555 1234</span>
              </a>
              <div className="flex items-start gap-3 text-gray-400 text-sm">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span>80 Playfair Road #04-12, Singapore 367998</span>
              </div>
            </div>
          </div>

          {/* Our Stores */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Our Stores</h4>
            <div className="space-y-3 text-sm">
              <p>
                <span className="font-medium text-white">Hougang:</span>{" "}
                <span className="text-gray-400">685 Hougang St 61, #01-154</span>
              </p>
              <p>
                <span className="font-medium text-white">Kovan:</span>{" "}
                <span className="text-gray-400">210 Kovan Branch</span>
              </p>
              <p>
                <span className="font-medium text-white">MacPherson:</span>{" "}
                <span className="text-gray-400">469 MacPherson Rd, #01-02</span>
              </p>
            </div>
            <p className="mt-4 text-orange-400 font-medium text-sm">
              Open Daily: 9am - 9pm
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <nav className="space-y-2.5">
              <Link href="/catalog" className="block text-gray-400 hover:text-orange-400 transition-colors text-sm">
                All Products
              </Link>
              <Link href="/catalog" className="block text-gray-400 hover:text-orange-400 transition-colors text-sm">
                Featured Products
              </Link>
              <Link href="/track-order" className="block text-gray-400 hover:text-orange-400 transition-colors text-sm">
                Track Orders
              </Link>
              <Link href="/assistant" className="block text-gray-400 hover:text-orange-400 transition-colors text-sm">
                Help Center
              </Link>
            </nav>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Services</h4>
            <nav className="space-y-2.5">
              <Link href="/catalog" className="block text-gray-400 hover:text-orange-400 transition-colors text-sm">
                Retail & Wholesale Hardware
              </Link>
              <Link href="/catalog" className="block text-gray-400 hover:text-orange-400 transition-colors text-sm">
                DIY Products & Assembly
              </Link>
              <Link href="/catalog" className="block text-gray-400 hover:text-orange-400 transition-colors text-sm">
                Electrical Appliances
              </Link>
              <Link href="/assistant" className="block text-gray-400 hover:text-orange-400 transition-colors text-sm">
                In-house Handyman Service
              </Link>
              <Link href="/assistant" className="block text-gray-400 hover:text-orange-400 transition-colors text-sm">
                Repair & Service Centre
              </Link>
              <Link href="/" className="block text-orange-400 hover:text-orange-300 transition-colors text-sm font-medium">
                Bulk Orders & Group Buys
              </Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-700/50">
        <div className="container py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
            <p>
              © 2026 UnidBox Hardware Pte. Ltd. (UEN: 201507560E). All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="#" className="hover:text-orange-400 transition-colors">
                Privacy Policy
              </Link>
              <Link href="#" className="hover:text-orange-400 transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
