export type CartLineItem = {
  id: string;
  productId: string;
  quantity: number;
  promoApplied: boolean;
};

export type Order = {
  id: string;
  subtotal: number;
  discount: number;
  total: number;
  qualifyingLineCount: number;
  ts: number;
};

let cart: CartLineItem[] = [];
let orders: Order[] = [];
let nextLineId = 1;
let nextOrderId = 1;

export function getCart(): CartLineItem[] {
  return cart;
}

export function addLineItem(productId: string, quantity: number): CartLineItem {
  const lineItem: CartLineItem = {
    id: `line-${nextLineId++}`,
    productId,
    quantity,
    promoApplied: false,
  };
  cart.push(lineItem);
  return lineItem;
}

export function markLinePromoApplied(lineItemId: string): CartLineItem | undefined {
  const lineItem = cart.find((candidate) => candidate.id === lineItemId);
  if (lineItem) {
    lineItem.promoApplied = true;
  }
  return lineItem;
}

export function nextOrderIdValue(): string {
  return `order-${nextOrderId++}`;
}

export function recordOrder(order: Order): void {
  orders.push(order);
}

export function getOrders(): Order[] {
  return orders;
}

export function resetStore(): void {
  cart = [];
  orders = [];
  nextLineId = 1;
  nextOrderId = 1;
}
