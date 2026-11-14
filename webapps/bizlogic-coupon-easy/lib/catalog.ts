export type Product = {
  id: string;
  name: string;
  unitPriceCents: number;
};

export const PRODUCTS: Product[] = [
  { id: "mouse", name: "Wireless Mouse", unitPriceCents: 2999 },
  { id: "keyboard", name: "Mechanical Keyboard", unitPriceCents: 8999 },
  { id: "hub", name: "USB-C Travel Hub", unitPriceCents: 4499 },
  { id: "stand", name: "Aluminium Laptop Stand", unitPriceCents: 3599 },
];

export function findProduct(productId: string): Product | undefined {
  return PRODUCTS.find((product) => product.id === productId);
}
