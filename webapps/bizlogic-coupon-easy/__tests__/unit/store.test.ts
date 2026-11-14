import {
  getCart,
  addLineItem,
  markLinePromoApplied,
  recordOrder,
  getOrders,
  resetStore,
} from "@/lib/store";

beforeEach(() => {
  resetStore();
});

describe("addLineItem", () => {
  it("appends a new line item with promoApplied false", () => {
    const line = addLineItem("mouse", 1);
    expect(line.productId).toBe("mouse");
    expect(line.quantity).toBe(1);
    expect(line.promoApplied).toBe(false);
    expect(getCart()).toHaveLength(1);
  });

  it("creates a distinct line item on every call, even for the same product", () => {
    addLineItem("mouse", 1);
    addLineItem("mouse", 1);
    const cart = getCart();
    expect(cart).toHaveLength(2);
    expect(cart[0].id).not.toBe(cart[1].id);
  });
});

describe("markLinePromoApplied", () => {
  it("flips promoApplied to true for the matching line item", () => {
    const line = addLineItem("mouse", 1);
    const updated = markLinePromoApplied(line.id);
    expect(updated?.promoApplied).toBe(true);
    expect(getCart()[0].promoApplied).toBe(true);
  });

  it("returns undefined for an unknown line item id", () => {
    expect(markLinePromoApplied("does-not-exist")).toBeUndefined();
  });
});

describe("orders", () => {
  it("records and lists orders", () => {
    recordOrder({
      id: "order-1",
      subtotal: 1000,
      discount: 200,
      total: 800,
      qualifyingLineCount: 1,
      ts: 123,
    });
    expect(getOrders()).toHaveLength(1);
    expect(getOrders()[0].id).toBe("order-1");
  });
});

describe("resetStore", () => {
  it("clears the cart and orders", () => {
    addLineItem("mouse", 1);
    recordOrder({
      id: "order-1",
      subtotal: 1000,
      discount: 0,
      total: 1000,
      qualifyingLineCount: 0,
      ts: 123,
    });
    resetStore();
    expect(getCart()).toEqual([]);
    expect(getOrders()).toEqual([]);
  });
});
