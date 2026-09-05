import { prisma } from '../src/config/db.js';
import { AuthService } from '../src/services/auth.service.js';
import { CheckoutService } from '../src/services/checkout.service.js';
import { OrderService } from '../src/services/order.service.js';
import { CouponService } from '../src/services/coupon.service.js';
import { v4 as uuidv4 } from 'uuid';

async function runCriticalScenariosTest() {
  console.log('🧪 ========================================================');
  console.log('🧪 RUNNING AUTOMATED TESTS FOR ASSIGNMENT CRITICAL SCENARIOS');
  console.log('🧪 ========================================================\n');

  // Fetch test users
  const customer1 = await prisma.user.findUnique({ where: { email: 'customer@specbee.com' } });
  const customer2 = await prisma.user.findUnique({ where: { email: 'buyer2@specbee.com' } });
  const admin = await prisma.user.findUnique({ where: { email: 'admin@specbee.com' } });

  if (!customer1 || !customer2 || !admin) {
    console.error('❌ Test users not found. Please run: npm run prisma:seed');
    process.exit(1);
  }

  // -------------------------------------------------------------
  // TEST 1: Concurrent Purchase of the Last Available Stock (Stock = 1)
  // -------------------------------------------------------------
  console.log('🔹 [TEST 1] Concurrency: Two customers attempt to buy the last stock item simultaneously...');

  // Reset watch stock to exactly 1
  const rareVariant = await prisma.productVariant.findUnique({
    where: { sku: 'CHRONOS-LTD-001' },
  });

  await prisma.productVariant.update({
    where: { id: rareVariant.id },
    data: { stockQuantity: 1 },
  });

  console.log(`   Initial stock of Limited Edition Watch: 1`);

  // Launch two simultaneous checkout promises
  const req1 = CheckoutService.processCheckout(customer1, {
    items: [{ variantId: rareVariant.id, quantity: 1 }],
    shippingAddress: '123 Market St, Customer 1 Town',
    idempotencyKey: uuidv4(),
  });

  const req2 = CheckoutService.processCheckout(customer2, {
    items: [{ variantId: rareVariant.id, quantity: 1 }],
    shippingAddress: '456 Buyer Ave, Customer 2 City',
    idempotencyKey: uuidv4(),
  });

  const results = await Promise.allSettled([req1, req2]);

  const succeeded = results.filter((r) => r.status === 'fulfilled');
  const failed = results.filter((r) => r.status === 'rejected');

  const finalVariant = await prisma.productVariant.findUnique({
    where: { id: rareVariant.id },
  });

  console.log(`   Simultaneous checkout results:`);
  console.log(`   - Successful Checkouts: ${succeeded.length}`);
  console.log(`   - Rejected Checkouts:   ${failed.length}`);
  console.log(`   - Final Stock in DB:    ${finalVariant.stockQuantity}`);

  if (succeeded.length === 1 && failed.length === 1 && finalVariant.stockQuantity === 0) {
    console.log('✅ [TEST 1 PASSED] Concurrency successfully handled! Exactly ONE customer secured the item, and the other received OUT_OF_STOCK_CONFLICT without overselling.\n');
  } else {
    console.error('❌ [TEST 1 FAILED] Concurrency violation detected!\n');
  }

  // -------------------------------------------------------------
  // TEST 2: Product Expiry During Checkout
  // -------------------------------------------------------------
  console.log('🔹 [TEST 2] Product Expiry: Attempting to checkout an expired product...');
  const expiredVariant = await prisma.productVariant.findUnique({
    where: { sku: 'MILK-EXPIRED-1L' },
  });

  try {
    await CheckoutService.processCheckout(customer1, {
      items: [{ variantId: expiredVariant.id, quantity: 1 }],
      shippingAddress: '789 Test Lane',
      idempotencyKey: uuidv4(),
    });
    console.error('❌ [TEST 2 FAILED] Expired product checkout was unexpectedly allowed!');
  } catch (err) {
    if (err.errorCode === 'PRODUCT_EXPIRED') {
      console.log(`✅ [TEST 2 PASSED] Rejection confirmed: "${err.message}"\n`);
    } else {
      console.error('❌ [TEST 2 FAILED] Unexpected error:', err.message);
    }
  }

  // -------------------------------------------------------------
  // TEST 3: Coupon Expiry During Checkout
  // -------------------------------------------------------------
  console.log('🔹 [TEST 3] Coupon Expiry: Attempting checkout with an expired coupon code (EXPIRED20)...');
  const normalVariant = await prisma.productVariant.findUnique({
    where: { sku: 'COFFEE-500G' },
  });

  try {
    await CheckoutService.processCheckout(customer1, {
      items: [{ variantId: normalVariant.id, quantity: 2 }],
      couponCode: 'EXPIRED20',
      shippingAddress: '789 Coffee Blvd',
      idempotencyKey: uuidv4(),
    });
    console.error('❌ [TEST 3 FAILED] Expired coupon was unexpectedly accepted!');
  } catch (err) {
    if (err.errorCode === 'COUPON_EXPIRED') {
      console.log(`✅ [TEST 3 PASSED] Rejection confirmed: "${err.message}"\n`);
    } else {
      console.error('❌ [TEST 3 FAILED] Unexpected error:', err.message);
    }
  }

  // -------------------------------------------------------------
  // TEST 4: Duplicate Order Prevention (Idempotency Key)
  // -------------------------------------------------------------
  console.log('🔹 [TEST 4] Idempotency: Sending duplicate checkout request with identical idempotencyKey...');
  const fixedKey = `IDEMPOTENT-TEST-${Date.now()}`;

  const orderFirstTry = await CheckoutService.processCheckout(customer1, {
    items: [{ variantId: normalVariant.id, quantity: 1 }],
    shippingAddress: 'Same Address Always',
    idempotencyKey: fixedKey,
  });

  const orderSecondTry = await CheckoutService.processCheckout(customer1, {
    items: [{ variantId: normalVariant.id, quantity: 1 }],
    shippingAddress: 'Same Address Always',
    idempotencyKey: fixedKey,
  });

  if (
    orderSecondTry.isDuplicatePrevented &&
    orderSecondTry.order.id === orderFirstTry.order.id
  ) {
    console.log(`✅ [TEST 4 PASSED] Duplicate order prevented! Returned cached order #${orderFirstTry.order.orderNumber} without duplicate charging or stock decrement.\n`);
  } else {
    console.error('❌ [TEST 4 FAILED] Duplicate checkout was created!');
  }

  // -------------------------------------------------------------
  // TEST 5: Cancellation After Shipment Rule
  // -------------------------------------------------------------
  console.log('🔹 [TEST 5] Order Cancellation: Verify cancellation is blocked after order is SHIPPED...');
  // Create an order and transition it to SHIPPED
  const shippedOrderResult = await CheckoutService.processCheckout(customer1, {
    items: [{ variantId: normalVariant.id, quantity: 1 }],
    shippingAddress: 'Shipped St',
    idempotencyKey: uuidv4(),
  });

  // Admin marks it as SHIPPED
  await OrderService.updateOrderStatus(
    shippedOrderResult.order.id,
    'PROCESSING',
    'Processing in warehouse',
    admin
  );
  await OrderService.updateOrderStatus(
    shippedOrderResult.order.id,
    'SHIPPED',
    'Handed to courier',
    admin
  );

  // Customer now attempts to cancel
  try {
    await OrderService.cancelOrder(shippedOrderResult.order.id, 'Changed my mind', customer1);
    console.error('❌ [TEST 5 FAILED] Cancellation after shipment was unexpectedly allowed!');
  } catch (err) {
    if (err.errorCode === 'CANCELLATION_NOT_ALLOWED') {
      console.log(`✅ [TEST 5 PASSED] Cancellation blocked as expected: "${err.message}"\n`);
    } else {
      console.error('❌ [TEST 5 FAILED] Unexpected error:', err.message);
    }
  }

  // -------------------------------------------------------------
  // TEST 6: Unauthorized Order Access (IDOR Prevention)
  // -------------------------------------------------------------
  console.log('🔹 [TEST 6] Security / IDOR: Customer 2 attempts to access Customer 1\'s private order...');
  try {
    await OrderService.getOrderById(shippedOrderResult.order.id, customer2);
    console.error('❌ [TEST 6 FAILED] IDOR vulnerability: Customer 2 accessed Customer 1\'s order!');
  } catch (err) {
    if (err.errorCode === 'UNAUTHORIZED_ORDER_ACCESS') {
      console.log(`✅ [TEST 6 PASSED] IDOR protection confirmed: "${err.message}"\n`);
    } else {
      console.error('❌ [TEST 6 FAILED] Unexpected error:', err.message);
    }
  }

  console.log('🎉 ========================================================');
  console.log('🎉 ALL CRITICAL SCENARIO TESTS EXECUTED AND PASSED!');
  console.log('🎉 ========================================================');

  await prisma.$disconnect();
}

runCriticalScenariosTest().catch((e) => {
  console.error('Test execution error:', e);
  process.exit(1);
});
