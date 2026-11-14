import { NextRequest } from "next/server";
import { findProduct } from "@/lib/catalog";
import { addLineItem, getCart } from "@/lib/store";
import { fireCheckpoint } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { productId, quantity } = (body ?? {}) as Record<string, unknown>;

  if (typeof productId !== "string" || !findProduct(productId)) {
    return Response.json({ error: "unknown productId" }, { status: 400 });
  }

  if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity <= 0) {
    return Response.json({ error: "quantity must be a positive integer" }, { status: 400 });
  }

  addLineItem(productId, quantity);
  fireCheckpoint("item_added", "POST /api/cart/add");

  return Response.json({ cart: getCart() }, { status: 200 });
}
