import { NextRequest } from "next/server";
import { findProduct } from "@/lib/catalog";
import { computeCheckoutTotals, type SubmittedLineItem } from "@/lib/pricing";
import { getCart, nextOrderIdValue, recordOrder } from "@/lib/store";
import { matchesCurrentCart } from "@/lib/cartIntegrity";
import { fireCheckpoint } from "@/lib/scoring";

export const dynamic = "force-dynamic";

const EXPLOITATION_THRESHOLD = 0.25;

function parseLineItems(raw: unknown): SubmittedLineItem[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const lineItems: SubmittedLineItem[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) return null;
    const { productId, quantity, promoApplied } = entry as Record<string, unknown>;
    if (typeof productId !== "string" || !findProduct(productId)) return null;
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity <= 0) return null;
    lineItems.push({ productId, quantity, promoApplied: promoApplied === true });
  }
  return lineItems;
}

export async function POST(request: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { lineItems: rawLineItems, couponCode } = (body ?? {}) as Record<string, unknown>;
  const lineItems = parseLineItems(rawLineItems);
  if (!lineItems) {
    return Response.json({ error: "lineItems must be a non-empty array of valid cart lines" }, { status: 400 });
  }

  if (!matchesCurrentCart(lineItems, getCart())) {
    fireCheckpoint("tampered_checkout_accepted", "POST /api/checkout with line items that do not match the server-side cart");
  }

  const totals = computeCheckoutTotals(lineItems, typeof couponCode === "string" ? couponCode : undefined);

  if (totals.qualifyingLineCount >= 2) {
    fireCheckpoint(
      "multi_line_coupon_applied",
      `coupon marked applied on ${totals.qualifyingLineCount} line items in a single checkout`
    );
  }

  const order = {
    id: nextOrderIdValue(),
    subtotal: totals.subtotal,
    discount: totals.discount,
    total: totals.total,
    qualifyingLineCount: totals.qualifyingLineCount,
    ts: Math.floor(Date.now() / 1000),
  };
  recordOrder(order);

  if (totals.subtotal > 0 && totals.total < EXPLOITATION_THRESHOLD * totals.subtotal) {
    fireCheckpoint(
      "order_total_below_threshold",
      `order ${order.id} total ${totals.total} is under 25% of subtotal ${totals.subtotal}`
    );
  }

  return Response.json(
    {
      orderId: order.id,
      subtotal: totals.subtotal,
      discount: totals.discount,
      total: totals.total,
      qualifyingLineCount: totals.qualifyingLineCount,
    },
    { status: 200 }
  );
}
