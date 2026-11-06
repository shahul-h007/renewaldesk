import assert from 'node:assert';
import {
  buildRazorpayCheckoutOptions,
  getRazorpayConfigId,
} from '../lib/billing/checkout-options';

async function runRazorpayConfigIdTests() {
  console.log('================================================================');
  console.log('       RAZORPAY CHECKOUT CONFIG ID & OPTIONS TEST SUITE');
  console.log('================================================================\n');

  const baseParams = {
    session: {
      keyId: 'rzp_test_samplekey123',
      type: 'order' as const,
      amount: 499900,
      currency: 'INR',
      orderId: 'order_test_98765',
    },
    plan: {
      id: 'lifetime_founding',
      name: 'Founding Lifetime',
      maxActiveCustomers: 250,
    },
    customer: {
      businessId: 'biz_sample_uuid',
      businessName: 'Apex AC Care',
      businessPhone: '9846011222',
      userEmail: 'owner@apexac.com',
    },
    onSuccess: async () => {},
  };

  // Test 1: When config_id is explicitly unset/undefined
  const optionsWithoutConfig = buildRazorpayCheckoutOptions({
    ...baseParams,
    configId: undefined,
  });

  assert.strictEqual(
    'config_id' in optionsWithoutConfig,
    false,
    'config_id must NOT be present in Razorpay options when unset'
  );
  assert.strictEqual(optionsWithoutConfig.key, 'rzp_test_samplekey123');
  assert.strictEqual(optionsWithoutConfig.order_id, 'order_test_98765');
  assert.strictEqual(optionsWithoutConfig.amount, 499900);
  console.log('  ✔ config_id is strictly omitted when unset or undefined');

  // Test 2: When config_id is an empty string or whitespace
  const optionsWithEmptyConfig = buildRazorpayCheckoutOptions({
    ...baseParams,
    configId: '   ',
  });

  assert.strictEqual(
    'config_id' in optionsWithEmptyConfig,
    false,
    'config_id must NOT be present in Razorpay options when whitespace'
  );
  console.log('  ✔ config_id is strictly omitted when set to empty string or whitespace');

  // Test 3: When config_id is provided
  const dummyTestConfigId = 'config_sample_test_id';
  const optionsWithConfig = buildRazorpayCheckoutOptions({
    ...baseParams,
    configId: dummyTestConfigId,
  });

  assert.strictEqual(
    optionsWithConfig.config_id,
    dummyTestConfigId,
    'config_id must match provided configuration ID'
  );
  assert.strictEqual(optionsWithConfig.key, 'rzp_test_samplekey123');
  assert.strictEqual(optionsWithConfig.notes.businessId, 'biz_sample_uuid');
  console.log('  ✔ config_id is correctly included in Razorpay options when set');

  // Test 4: Environment variable resolution via getRazorpayConfigId()
  const originalEnv = process.env.NEXT_PUBLIC_RAZORPAY_CONFIG_ID;
  try {
    delete process.env.NEXT_PUBLIC_RAZORPAY_CONFIG_ID;
    assert.strictEqual(getRazorpayConfigId(), undefined, 'Returns undefined when env var is deleted');

    process.env.NEXT_PUBLIC_RAZORPAY_CONFIG_ID = '   ';
    assert.strictEqual(getRazorpayConfigId(), undefined, 'Returns undefined when env var is whitespace');

    process.env.NEXT_PUBLIC_RAZORPAY_CONFIG_ID = 'config_env_test_id';
    assert.strictEqual(getRazorpayConfigId(), 'config_env_test_id', 'Returns trimmed env var value when set');

    const defaultOptions = buildRazorpayCheckoutOptions(baseParams);
    assert.strictEqual(defaultOptions.config_id, 'config_env_test_id');
    console.log('  ✔ getRazorpayConfigId() accurately resolves from NEXT_PUBLIC_RAZORPAY_CONFIG_ID');
  } finally {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_RAZORPAY_CONFIG_ID = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_RAZORPAY_CONFIG_ID;
    }
  }

  // Test 5: Recurring subscription options structure
  const subParams = {
    ...baseParams,
    session: {
      keyId: 'rzp_test_samplekey123',
      type: 'subscription' as const,
      subscriptionId: 'sub_test_12345',
    },
    configId: 'config_sub_test',
  };
  const subOptions = buildRazorpayCheckoutOptions(subParams);
  assert.strictEqual(subOptions.subscription_id, 'sub_test_12345');
  assert.strictEqual(subOptions.order_id, undefined, 'order_id must not be set on subscriptions');
  assert.strictEqual(subOptions.config_id, 'config_sub_test');
  console.log('  ✔ Subscription options correctly include subscription_id and optional config_id');

  console.log('\n================================================================');
  console.log('   🎉 ALL RAZORPAY CONFIG ID & CHECKOUT OPTIONS TESTS PASSED');
  console.log('================================================================\n');
}

runRazorpayConfigIdTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
