import { NextRequest } from "next/server";
import { markLinePromoApplied, getCart } from "@/lib/store";
import { COUPON_CODE } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { lineItemId, code } = (body ?? {}) as Record<string, unknown>;

  if (typeof lineItemId !== "string") {
    return Response.json({ error: "lineItemId is required" }, { status: 400 });
  }

  if (code !== COUPON_CODE) {
    return Response.json({ error: "invalid coupon code" }, { status: 400 });
  }

  const updated = markLinePromoApplied(lineItemId);
  if (!updated) {
    return Response.json({ error: "line item not found" }, { status: 404 });
  }

  return Response.json({ cart: getCart() }, { status: 200 });
}
