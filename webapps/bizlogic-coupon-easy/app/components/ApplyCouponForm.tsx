"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ApplyCouponForm({ lineItemId }: { lineItemId: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/cart/apply-coupon", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lineItemId, code }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "could not apply coupon");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Coupon code"
        value={code}
        onChange={(event) => setCode(event.target.value)}
      />
      <button type="submit">Apply</button>
      {error && <p className="muted">{error}</p>}
    </form>
  );
}
