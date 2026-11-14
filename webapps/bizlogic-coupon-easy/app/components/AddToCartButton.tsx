"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddToCartButton({ productId }: { productId: string }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setPending(true);
    try {
      await fetch("/api/cart/add", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      router.push("/cart");
    } finally {
      setPending(false);
    }
  }

  return (
    <button onClick={handleClick} disabled={pending}>
      {pending ? "Adding..." : "Add to cart"}
    </button>
  );
}
