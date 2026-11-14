import {
  computeSubtotalCents,
  computeCheckoutTotals,
  COUPON_CODE,
} from "@/lib/pricing";

describe("computeSubtotalCents", () => {
  it("sums unit price times quantity across line items", () => {
    const subtotal = computeSubtotalCents([
      { productId: "mouse", quantity: 2, promoApplied: false },
      { productId: "hub", quantity: 1, promoApplied: false },
    ]);
    expect(subtotal).toBe(2999 * 2 + 4499);
  });

  it("ignores unknown product ids rather than throwing", () => {
    const subtotal = computeSubtotalCents([
      { productId: "does-not-exist", quantity: 5, promoApplied: false },
    ]);
    expect(subtotal).toBe(0);
  });

  it("returns 0 for an empty cart", () => {
    expect(computeSubtotalCents([])).toBe(0);
  });
});

describe("computeCheckoutTotals", () => {
  it("applies no discount when no line item has the coupon applied", () => {
    const result = computeCheckoutTotals(
      [{ productId: "mouse", quantity: 1, promoApplied: false }],
      COUPON_CODE
    );
    expect(result.discount).toBe(0);
    expect(result.total).toBe(result.subtotal);
    expect(result.qualifyingLineCount).toBe(0);
  });

  it("applies no discount when the coupon code is wrong, even if promoApplied is true", () => {
    const result = computeCheckoutTotals(
      [{ productId: "mouse", quantity: 1, promoApplied: true }],
      "NOT-A-REAL-CODE"
    );
    expect(result.discount).toBe(0);
    expect(result.qualifyingLineCount).toBe(0);
  });

  it("applies the discount once for a single qualifying line item", () => {
    const lineItems = [{ productId: "mouse", quantity: 1, promoApplied: true }];
    const result = computeCheckoutTotals(lineItems, COUPON_CODE);
    const subtotal = computeSubtotalCents(lineItems);
    expect(result.qualifyingLineCount).toBe(1);
    expect(result.discount).toBe(Math.round(subtotal * 0.2));
    expect(result.total).toBe(subtotal - result.discount);
  });

  it("stacks the discount once per qualifying line item (the business-logic bug under test)", () => {
    const lineItems = [
      { productId: "mouse", quantity: 1, promoApplied: true },
      { productId: "mouse", quantity: 1, promoApplied: true },
    ];
    const result = computeCheckoutTotals(lineItems, COUPON_CODE);
    const subtotal = computeSubtotalCents(lineItems);
    expect(result.qualifyingLineCount).toBe(2);
    expect(result.discount).toBe(2 * Math.round(subtotal * 0.2));
  });

  it("clamps the discount so the total never goes negative", () => {
    const lineItems = [
      { productId: "mouse", quantity: 1, promoApplied: true },
      { productId: "mouse", quantity: 1, promoApplied: true },
      { productId: "mouse", quantity: 1, promoApplied: true },
      { productId: "mouse", quantity: 1, promoApplied: true },
      { productId: "mouse", quantity: 1, promoApplied: true },
      { productId: "mouse", quantity: 1, promoApplied: true },
      { productId: "mouse", quantity: 1, promoApplied: true },
      { productId: "mouse", quantity: 1, promoApplied: true },
    ]; // 8 lines x 20% would be 160% off; must clamp at 100%
    const result = computeCheckoutTotals(lineItems, COUPON_CODE);
    expect(result.discount).toBe(result.subtotal);
    expect(result.total).toBe(0);
  });

  it("exploiting 4 qualifying line items drops the total below 25% of the true subtotal", () => {
    const lineItems = [
      { productId: "mouse", quantity: 1, promoApplied: true },
      { productId: "mouse", quantity: 1, promoApplied: true },
      { productId: "mouse", quantity: 1, promoApplied: true },
      { productId: "mouse", quantity: 1, promoApplied: true },
    ];
    const result = computeCheckoutTotals(lineItems, COUPON_CODE);
    expect(result.total).toBeLessThan(0.25 * result.subtotal);
  });
});
