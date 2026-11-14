"use client";

import { useState } from "react";

type CheckoutLineItem = {
  productId: string;
  quantity: number;
  promoApplied: boolean;
};

type OrderResult = {
  orderId: string;
  subtotal: number;
  discount: number;
  total: number;
};

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CheckoutForm({ lineItems }: { lineItems: CheckoutLineItem[] }) {
  const [couponCode, setCouponCode] = useState("");
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lineItems, couponCode }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "checkout failed");
        return;
      }
      setOrder(body);
    } finally {
      setSubmitting(false);
    }
  }

  if (order) {
    return (
      <div className="summary-box">
        <h2>Order placed</h2>
        <p>Order ID: {order.orderId}</p>
        <p>Subtotal: {formatPrice(order.subtotal)}</p>
        <p>Discount: -{formatPrice(order.discount)}</p>
        <p>
          <strong>Total charged: {formatPrice(order.total)}</strong>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="summary-box">
      <label htmlFor="coupon-code">Coupon code</label>
      <br />
      <input
        id="coupon-code"
        type="text"
        value={couponCode}
        onChange={(event) => setCouponCode(event.target.value)}
        placeholder="Enter coupon code"
      />
      <br />
      <br />
      <button type="submit" disabled={submitting}>
        {submitting ? "Placing order..." : "Place order"}
      </button>
      {error && <p className="muted">{error}</p>}
    </form>
  );
}
