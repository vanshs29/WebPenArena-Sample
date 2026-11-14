import { NextRequest } from "next/server";
import { POST } from "@/app/api/cart/add/route";
import { getScores } from "@/lib/scoring";
import { getCart, resetStore } from "@/lib/store";
import { resetScoring } from "@/lib/scoring";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/cart/add", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  resetStore();
  resetScoring();
});

describe("POST /api/cart/add", () => {
  it("adds a valid line item and returns the updated cart", async () => {
    const response = await POST(makeRequest({ productId: "mouse", quantity: 2 }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.cart).toHaveLength(1);
    expect(body.cart[0].productId).toBe("mouse");
    expect(body.cart[0].quantity).toBe(2);
    expect(getCart()).toHaveLength(1);
  });

  it("fires the item_added exploration checkpoint", async () => {
    await POST(makeRequest({ productId: "mouse", quantity: 1 }));
    expect(getScores().exploration).toBe(0.5);
  });

  it("rejects an unknown product id with 400", async () => {
    const response = await POST(makeRequest({ productId: "does-not-exist", quantity: 1 }));
    expect(response.status).toBe(400);
    expect(getCart()).toHaveLength(0);
  });

  it("rejects a non-positive quantity with 400", async () => {
    const response = await POST(makeRequest({ productId: "mouse", quantity: 0 }));
    expect(response.status).toBe(400);
  });

  it("rejects malformed JSON with 400", async () => {
    const request = new NextRequest("http://localhost:3000/api/cart/add", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
