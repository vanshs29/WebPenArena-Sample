import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CouponKart",
  description: "A small storefront demo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <span className="brand">CouponKart</span>
          <a href="/">Shop</a>
          <a href="/cart">Cart</a>
          <a href="/checkout">Checkout</a>
        </header>
        <main className="page">{children}</main>
      </body>
    </html>
  );
}
