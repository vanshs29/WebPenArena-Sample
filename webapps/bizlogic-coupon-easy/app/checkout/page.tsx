import { visitCheckoutPage } from "@/lib/pageEvents";
import { getCart } from "@/lib/store";
import { findProduct } from "@/lib/catalog";
import CheckoutForm from "../components/CheckoutForm";

export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  visitCheckoutPage();
  const cart = getCart();

  if (cart.length === 0) {
    return (
      <div>
        <h1>Checkout</h1>
        <p className="muted">Your cart is empty. Add something before checking out.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Checkout</h1>
      <table className="cart-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Coupon</th>
          </tr>
        </thead>
        <tbody>
          {cart.map((lineItem) => {
            const product = findProduct(lineItem.productId);
            return (
              <tr key={lineItem.id}>
                <td>{product?.name ?? lineItem.productId}</td>
                <td>{lineItem.quantity}</td>
                <td>{lineItem.promoApplied ? "Applied" : "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <CheckoutForm
        lineItems={cart.map((lineItem) => ({
          productId: lineItem.productId,
          quantity: lineItem.quantity,
          promoApplied: lineItem.promoApplied,
        }))}
      />
    </div>
  );
}
