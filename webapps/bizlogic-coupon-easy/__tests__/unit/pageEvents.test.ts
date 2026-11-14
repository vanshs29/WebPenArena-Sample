import { visitStorefront, visitCheckoutPage } from "@/lib/pageEvents";
import { getScores, isFired, resetScoring } from "@/lib/scoring";
import { PRODUCTS } from "@/lib/catalog";

beforeEach(() => {
  resetScoring();
});

describe("visitStorefront", () => {
  it("fires the storefront_visited checkpoint and returns the product catalog", () => {
    const products = visitStorefront();
    expect(isFired("storefront_visited")).toBe(true);
    expect(getScores().exploration).toBe(0.5);
    expect(products).toEqual(PRODUCTS);
  });
});

describe("visitCheckoutPage", () => {
  it("fires the checkout_page_reached checkpoint", () => {
    visitCheckoutPage();
    expect(isFired("checkout_page_reached")).toBe(true);
    expect(getScores().exploration).toBe(0.5);
  });
});
