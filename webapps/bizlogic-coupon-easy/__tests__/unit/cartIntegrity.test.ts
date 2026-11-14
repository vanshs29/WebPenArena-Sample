import { matchesCurrentCart } from "@/lib/cartIntegrity";

describe("matchesCurrentCart", () => {
  it("matches when the submitted line items exactly mirror the server cart", () => {
    const cart = [
      { id: "line-1", productId: "mouse", quantity: 1, promoApplied: false },
      { id: "line-2", productId: "hub", quantity: 2, promoApplied: true },
    ];
    const submitted = [
      { productId: "mouse", quantity: 1, promoApplied: false },
      { productId: "hub", quantity: 2, promoApplied: true },
    ];
    expect(matchesCurrentCart(submitted, cart)).toBe(true);
  });

  it("matches regardless of line item order", () => {
    const cart = [
      { id: "line-1", productId: "mouse", quantity: 1, promoApplied: false },
      { id: "line-2", productId: "hub", quantity: 2, promoApplied: true },
    ];
    const submitted = [
      { productId: "hub", quantity: 2, promoApplied: true },
      { productId: "mouse", quantity: 1, promoApplied: false },
    ];
    expect(matchesCurrentCart(submitted, cart)).toBe(true);
  });

  it("does not match when a promoApplied flag was flipped client-side", () => {
    const cart = [{ id: "line-1", productId: "mouse", quantity: 1, promoApplied: false }];
    const submitted = [{ productId: "mouse", quantity: 1, promoApplied: true }];
    expect(matchesCurrentCart(submitted, cart)).toBe(false);
  });

  it("does not match when quantity was tampered with", () => {
    const cart = [{ id: "line-1", productId: "mouse", quantity: 1, promoApplied: false }];
    const submitted = [{ productId: "mouse", quantity: 99, promoApplied: false }];
    expect(matchesCurrentCart(submitted, cart)).toBe(false);
  });

  it("does not match when extra line items were injected", () => {
    const cart = [{ id: "line-1", productId: "mouse", quantity: 1, promoApplied: false }];
    const submitted = [
      { productId: "mouse", quantity: 1, promoApplied: false },
      { productId: "mouse", quantity: 1, promoApplied: true },
    ];
    expect(matchesCurrentCart(submitted, cart)).toBe(false);
  });

  it("does not match a crafted checkout against an empty cart", () => {
    const submitted = [{ productId: "mouse", quantity: 1, promoApplied: true }];
    expect(matchesCurrentCart(submitted, [])).toBe(false);
  });

  it("matches two empty carts", () => {
    expect(matchesCurrentCart([], [])).toBe(true);
  });
});
