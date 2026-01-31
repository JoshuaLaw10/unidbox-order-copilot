import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

interface LayoutProps {
  children: ReactNode;
  cartItemCount?: number;
  onSearch?: (query: string) => void;
  hideFooter?: boolean;
}

export function Layout({ children, cartItemCount = 0, onSearch, hideFooter = false }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header cartItemCount={cartItemCount} onSearch={onSearch} />
      <main className="flex-1">
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}

export default Layout;
