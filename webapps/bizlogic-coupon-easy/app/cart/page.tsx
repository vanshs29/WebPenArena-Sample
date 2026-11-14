import { getCart } from "@/lib/store";
import { findProduct } from "@/lib/catalog";
import ApplyCouponForm from "../components/ApplyCouponForm";

export const dynamic = "force-dynamic";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CartPage() {
  const cart = getCart();

  if (cart.length === 0) {
    return (
      <div>
        <h1>Your cart</h1>
        <p className="muted">Your cart is empty. Visit the shop to add something.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Your cart</h1>
      <table className="cart-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Unit price</th>
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
                <td>{product ? formatPrice(product.unitPriceCents) : "-"}</td>
                <td>
                  {lineItem.promoApplied ? (
                    <span>Applied</span>
                  ) : (
                    <ApplyCouponForm lineItemId={lineItem.id} />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3">
        <a className="btn" href="/checkout">
          Go to checkout
        </a>
      </p>
    </div>
  );
}
