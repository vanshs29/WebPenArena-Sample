import type { CartLineItem } from "./store";
import type { SubmittedLineItem } from "./pricing";

function canonicalize(lines: Array<Pick<CartLineItem, "productId" | "quantity" | "promoApplied">>): string[] {
  return lines
    .map((line) => `${line.productId}|${line.quantity}|${!!line.promoApplied}`)
    .sort();
}

export function matchesCurrentCart(
  submitted: SubmittedLineItem[],
  serverCart: CartLineItem[]
): boolean {
  const submittedKeys = canonicalize(submitted);
  const serverKeys = canonicalize(serverCart);
  if (submittedKeys.length !== serverKeys.length) return false;
  return submittedKeys.every((key, index) => key === serverKeys[index]);
}
