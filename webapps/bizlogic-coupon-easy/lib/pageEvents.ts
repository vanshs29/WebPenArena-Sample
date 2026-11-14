import { PRODUCTS, type Product } from "./catalog";
import { fireCheckpoint } from "./scoring";

export function visitStorefront(): Product[] {
  fireCheckpoint("storefront_visited", "GET /");
  return PRODUCTS;
}

export function visitCheckoutPage(): void {
  fireCheckpoint("checkout_page_reached", "GET /checkout");
}
