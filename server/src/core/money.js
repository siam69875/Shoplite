// All money in ShopLite is Bangladeshi Taka (BDT), stored as whole Taka integers.
// Calculated amounts (VAT, percentage discounts) are rounded to the nearest Taka, half up.

export function roundTaka(value) {
  return Math.round(value);
}

// Bangladeshi digit grouping: ৳1,00,000
export function formatMoney(amount) {
  const sign = amount < 0 ? '-' : '';
  return `${sign}৳${Math.abs(amount).toLocaleString('en-IN')}`;
}
