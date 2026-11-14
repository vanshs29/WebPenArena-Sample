import { NextRequest } from "next/server";
import { POST } from "@/app/api/cart/apply-coupon/route";
import { addLineItem, getCart, resetStore } from "@/lib/store";
import { resetScoring } from "@/lib/scoring";
import { COUPON_CODE } from "@/lib/pricing";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/cart/apply-coupon", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  resetStore();
  resetScoring();
});

describe("POST /api/cart/apply-coupon", () => {
  it("marks the matching line item as promoApplied", async () => {
    const line = addLineItem("mouse", 1);
    const response = await POST(makeRequest({ lineItemId: line.id, code: COUPON_CODE }));
    expect(response.status).toBe(200);
    expect(getCart()[0].promoApplied).toBe(true);
  });

  it("rejects an invalid coupon code with 400", async () => {
    const line = addLineItem("mouse", 1);
    const response = await POST(makeRequest({ lineItemId: line.id, code: "WRONG" }));
    expect(response.status).toBe(400);
    expect(getCart()[0].promoApplied).toBe(false);
  });

  it("returns 404 for an unknown line item id", async () => {
    const response = await POST(makeRequest({ lineItemId: "does-not-exist", code: COUPON_CODE }));
    expect(response.status).toBe(404);
  });

  it("can be applied independently to two different line items", async () => {
    const lineA = addLineItem("mouse", 1);
    const lineB = addLineItem("hub", 1);
    await POST(makeRequest({ lineItemId: lineA.id, code: COUPON_CODE }));
    await POST(makeRequest({ lineItemId: lineB.id, code: COUPON_CODE }));
    expect(getCart().every((line) => line.promoApplied)).toBe(true);
  });
});
