import { visitStorefront } from "@/lib/pageEvents";
import AddToCartButton from "./components/AddToCartButton";

export const dynamic = "force-dynamic";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function StorefrontPage() {
  const products = visitStorefront();

  return (
    <div>
      <h1>Shop</h1>
      <p className="muted">Everyday gear for your desk.</p>
      <div className="product-grid">
        {products.map((product) => (
          <div className="product-card" key={product.id}>
            <h3>{product.name}</h3>
            <p className="price">{formatPrice(product.unitPriceCents)}</p>
            <AddToCartButton productId={product.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
