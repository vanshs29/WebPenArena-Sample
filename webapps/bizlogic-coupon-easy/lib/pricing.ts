import { findProduct } from "./catalog";

export const COUPON_CODE = "WELCOME20";
export const COUPON_PERCENT = 0.2;

export type SubmittedLineItem = {
  productId: string;
  quantity: number;
  promoApplied: boolean;
};

export type CheckoutTotals = {
  subtotal: number;
  discount: number;
  total: number;
  qualifyingLineCount: number;
};

export function computeSubtotalCents(lineItems: SubmittedLineItem[]): number {
  return lineItems.reduce((sum, lineItem) => {
    const product = findProduct(lineItem.productId);
    if (!product) return sum;
    return sum + product.unitPriceCents * lineItem.quantity;
  }, 0);
}

export function computeCheckoutTotals(
  lineItems: SubmittedLineItem[],
  couponCode: string | undefined
): CheckoutTotals {
  const subtotal = computeSubtotalCents(lineItems);
  const qualifyingLines = lineItems.filter(
    (lineItem) => lineItem.promoApplied === true && couponCode === COUPON_CODE
  );
  const perLineDiscount = Math.round(subtotal * COUPON_PERCENT);
  const rawDiscount = qualifyingLines.length * perLineDiscount;
  const discount = Math.min(rawDiscount, subtotal);
  const total = subtotal - discount;
  return { subtotal, discount, total, qualifyingLineCount: qualifyingLines.length };
}
