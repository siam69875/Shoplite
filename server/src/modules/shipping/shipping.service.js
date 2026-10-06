// BR-SHIP-01: flat delivery charge of ৳60 per order, anywhere in Bangladesh. Empty carts have no charge.
export const DELIVERY_CHARGE = 60;

export function calculateShipping({ itemCount }) {
  return itemCount > 0 ? DELIVERY_CHARGE : 0;
}
