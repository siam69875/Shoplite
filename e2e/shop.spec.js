import { expect, test } from '@playwright/test';

async function login(page, email, password) {
  await page.goto('/login');
  await page.getByTestId('email-input').fill(email);
  await page.getByTestId('password-input').fill(password);
  await page.getByTestId('login-button').click();
  await expect(page.getByTestId('logout')).toBeVisible();
}

async function openProduct(page, name) {
  await page.goto(`/shop?search=${encodeURIComponent(name)}`);
  await page.getByTestId('product-name').filter({ hasText: name }).first().click();
  await expect(page.getByTestId('product-title')).toHaveText(name);
}

async function fillAddress(page) {
  await page.getByTestId('phone-input').fill('01712345678');
  await page.getByTestId('line1-input').fill('House 12, Road 5, Dhanmondi');
  await page.getByTestId('postalCode-input').fill('1205');
}

async function payWithBkash(page, walletNumber) {
  await page.getByTestId('pay-bkash').click();
  await page.getByTestId('walletNumber-input').fill(walletNumber);
  await page.getByTestId('send-otp').click();
  await page.getByTestId('otp-input').fill('123456');
}

test('shop search updates results while typing, without pressing Search', async ({ page }) => {
  await page.goto('/shop');
  await page.getByTestId('search-input').pressSequentially('jamdani', { delay: 40 });
  await expect(page.getByTestId('product-name')).toHaveText(['Dhakai Jamdani Saree']);
  await expect(page).toHaveURL(/search=jamdani/);
});

test('header search shows live suggestions', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('header-search').pressSequentially('honey', { delay: 40 });
  await expect(page.getByTestId('search-suggestion').first()).toContainText('Sundarbans Raw Honey');
  await page.getByTestId('search-suggestion').first().click();
  await expect(page.getByTestId('product-title')).toHaveText('Sundarbans Raw Honey 500g');
});

test('header search says when nothing matches', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('header-search').fill('xyzzy');
  await expect(page.getByTestId('search-no-results')).toBeVisible();
});

test('out-of-stock products cannot be added to the cart', async ({ page }) => {
  await page.goto('/shop?search=toothpaste');
  const card = page.locator('[data-testid^=product-card-]').first();
  await expect(card.getByTestId('stock-badge')).toHaveText('Out of stock');
  await expect(card.getByTestId('add-to-cart')).toBeDisabled();
});

test('customer buys with a coupon via bKash and the order matches the cart', async ({ page }) => {
  await login(page, 'alice@shoplite.test', 'Alice@123');
  await openProduct(page, 'Eid Special Cotton Panjabi');
  await page.getByTestId('quantity-plus').click();
  await page.getByTestId('detail-add-to-cart').click();
  await expect(page.getByTestId('toast')).toContainText('2 × Eid Special Cotton Panjabi added to cart');

  await page.getByTestId('nav-cart').click();
  await page.getByTestId('coupon-input').fill('WELCOME10');
  await page.getByTestId('apply-coupon').click();
  await expect(page.getByTestId('applied-coupon')).toContainText('WELCOME10');
  const cartTotal = await page.getByTestId('total').textContent();
  expect(cartTotal).toMatch(/^৳[\d,]+$/);

  await page.getByTestId('go-to-checkout').click();
  await fillAddress(page);
  await payWithBkash(page, '01812345678');
  await page.getByTestId('place-order').click();

  await expect(page.getByTestId('order-success')).toBeVisible();
  await expect(page.getByTestId('order-status').first()).toHaveText('PAID');
  await expect(page.getByTestId('order-totals').getByTestId('total')).toHaveText(cartTotal);
  await expect(page.getByTestId('payment-info')).toContainText('bKash ••5678');
  await expect(page.getByTestId('cart-count')).toHaveText('0');
});

test('a failed bKash payment shows an error and keeps the cart', async ({ page }) => {
  await login(page, 'bob@shoplite.test', 'Bob@1234');
  await openProduct(page, 'Spicy Chanachur 500g');
  await page.getByTestId('detail-add-to-cart').click();
  await expect(page.getByTestId('toast')).toBeVisible();
  await page.goto('/checkout');
  await fillAddress(page);
  await payWithBkash(page, '01712345000');
  await page.getByTestId('place-order').click();
  await expect(page.getByTestId('error-message')).toHaveText('Insufficient bKash balance. Please use another account.');
  await page.goto('/cart');
  await expect(page.getByTestId('cart-table')).toContainText('Spicy Chanachur 500g');
});

test('admin sees the dashboard; customers cannot', async ({ page }) => {
  await login(page, 'admin@shoplite.test', 'Admin@123');
  await page.goto('/admin');
  await expect(page.getByTestId('stat-revenue')).toContainText('৳');
  await page.getByTestId('logout').click();
  await expect(page.getByTestId('nav-login')).toBeVisible();

  await login(page, 'alice@shoplite.test', 'Alice@123');
  await expect(page.getByTestId('nav-admin')).toHaveCount(0);
  await page.goto('/admin');
  await expect(page.getByText('Admin access required.')).toBeVisible();
});

test('header, footer and product page show the delivery charge and hotline the server uses', async ({ page, request }) => {
  const info = await (await request.get('/api/store-info')).json();
  const delivery = `৳${info.deliveryCharge}`;
  await page.goto('/');
  await expect(page.locator('.topbar')).toContainText(`flat ${delivery}`);
  await expect(page.locator('.topbar')).toContainText(`Hotline ${info.hotline}`);
  await expect(page.locator('.site-footer')).toContainText(`Delivery: ${delivery} flat`);
  await expect(page.locator('.site-footer')).toContainText(`Returns within ${info.refundWindowDays} days`);
  await openProduct(page, 'Dhakai Jamdani Saree');
  await expect(page.locator('.delivery-info')).toContainText(`Delivery ${delivery}`);
});
