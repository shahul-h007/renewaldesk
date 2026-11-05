import assert from 'node:assert';
import {
  interpolateTemplate,
  validateTemplate,
  generateWhatsAppLink,
  sanitizeWhatsAppPhone,
  getCategorySampleData,
  SUPPORTED_PLACEHOLDERS,
  DEFAULT_TEMPLATES,
  TemplateVariables,
} from '../lib/whatsapp';
import {
  BUSINESS_TYPE_OPTIONS,
  getInitialTemplatesForCategory,
  getCategoryMetadata,
  normalizeCategory,
} from '../lib/catalog-presets';

async function main() {
  console.log('Running Phase 3: WhatsApp Templates & Placeholder Engine Test Suite...\n');

  // =========================================================================
  // 1. Starter Templates & Category Isolation
  // =========================================================================
  console.log('--- 1. Starter Templates & Category Isolation Tests ---');
  const prohibitedAcTerms = ['air condition', 'ac periodic', 'compressor breakdown', 'cooling loss'];

  assert.strictEqual(BUSINESS_TYPE_OPTIONS.length, 9, 'All 9 business categories must be defined');

  for (const bType of BUSINESS_TYPE_OPTIONS) {
    const templates = getInitialTemplatesForCategory(bType);
    assert(templates.length >= 5, `Category "${bType}" must have at least 5 starter templates`);

    const types = templates.map((t) => t.type);
    assert(types.includes('DUE_SOON'), `${bType} must include DUE_SOON`);
    assert(types.includes('DUE_TODAY'), `${bType} must include DUE_TODAY`);
    assert(types.includes('OVERDUE'), `${bType} must include OVERDUE`);
    assert(types.includes('BOOKING_CONFIRMATION'), `${bType} must include BOOKING_CONFIRMATION`);
    assert(types.includes('SERVICE_COMPLETED'), `${bType} must include SERVICE_COMPLETED`);
  }
  console.log('  ✔ All 9 business categories have 5 complete starter lifecycle templates');

  const nonAcCategories = BUSINESS_TYPE_OPTIONS.filter((b) => b !== 'Air Conditioning Maintenance');
  for (const bType of nonAcCategories) {
    const templates = getInitialTemplatesForCategory(bType);
    for (const tpl of templates) {
      const lower = tpl.templateText.toLowerCase();
      for (const term of prohibitedAcTerms) {
        assert(!lower.includes(term), `Category "${bType}" template contains prohibited AC term: "${term}"`);
      }
    }
  }
  console.log('  ✔ Confirmed 0 AC-specific terms found in non-AC starter templates');

  for (const tpl of DEFAULT_TEMPLATES) {
    const lower = tpl.templateText.toLowerCase();
    for (const term of prohibitedAcTerms) {
      assert(!lower.includes(term), `DEFAULT_TEMPLATES contains prohibited AC term: "${term}"`);
    }
  }
  console.log('  ✔ Confirmed DEFAULT_TEMPLATES in lib/whatsapp.ts is strictly category-neutral');

  // =========================================================================
  // 2. Placeholder Engine & Complete Interpolation
  // =========================================================================
  console.log('\n--- 2. Placeholder Engine & Complete Interpolation Tests ---');
  const expectedPlaceholders = [
    '{{customer_name}}',
    '{{business_name}}',
    '{{service_name}}',
    '{{due_date}}',
    '{{business_phone}}',
    '{{phone}}',
    '{{asset_name}}',
    '{{booking_date}}',
    '{{next_due_date}}',
    '{{days_overdue}}',
  ];

  for (const p of expectedPlaceholders) {
    assert(SUPPORTED_PLACEHOLDERS.includes(p as any), `Placeholder ${p} must be in SUPPORTED_PLACEHOLDERS`);
  }
  console.log('  ✔ All 10 standard placeholders documented and supported');

  const template =
    'Hi {{customer_name}}, this is {{business_name}}. Your {{service_name}} for {{asset_name}} is overdue by {{days_overdue}} days (was due on {{due_date}}). Your appointment is on {{booking_date}}. Next cycle: {{next_due_date}}. Contact {{business_phone}} or {{phone}}.';

  const vars: TemplateVariables = {
    customer_name: 'Rahul Sharma',
    business_name: 'Metro Motors',
    service_name: 'Periodic Vehicle Maintenance',
    asset_name: 'Maruti Brezza (KL-07-EE-9999)',
    due_date: '2026-10-10',
    booking_date: '2026-10-22',
    next_due_date: '2027-04-10',
    business_phone: '+91 98470 12345',
    phone: '+91 98470 12345',
    days_overdue: 12,
  };

  const interpolated = interpolateTemplate(template, vars);
  assert(interpolated.includes('Rahul Sharma'), 'customer_name interpolated');
  assert(interpolated.includes('Metro Motors'), 'business_name interpolated');
  assert(interpolated.includes('Periodic Vehicle Maintenance'), 'service_name interpolated');
  assert(interpolated.includes('Maruti Brezza (KL-07-EE-9999)'), 'asset_name interpolated');
  assert(interpolated.includes('12 days'), 'days_overdue interpolated');
  assert(interpolated.includes('10 Oct 2026'), 'due_date formatted');
  assert(interpolated.includes('22 Oct 2026'), 'booking_date formatted');
  assert(interpolated.includes('10 Apr 2027'), 'next_due_date formatted');
  assert(interpolated.includes('+91 98470 12345'), 'business_phone interpolated');
  assert(!interpolated.includes('{{'), 'No raw open braces remain');
  assert(!interpolated.includes('}}'), 'No raw close braces remain');
  console.log('  ✔ Complete data interpolated with zero raw braces or unparsed placeholders');

  // Days overdue calculation
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${fiveDaysAgo.getFullYear()}-${pad(fiveDaysAgo.getMonth() + 1)}-${pad(fiveDaysAgo.getDate())}`;
  const autoOverdue = interpolateTemplate('Overdue by {{days_overdue}} days.', { due_date: dateStr });
  assert.strictEqual(autoOverdue, 'Overdue by 5 days.', 'Calculates days_overdue accurately from past date');
  console.log('  ✔ Days overdue calculated automatically from past due_date');

  // Missing data fallbacks
  const emptyResult = interpolateTemplate(
    'Hello {{customer_name}}, {{business_name}} here. Your {{service_name}} for {{asset_name}} is due on {{due_date}}. Call {{business_phone}}.',
    {},
    { category: 'vehicle' }
  );
  assert(!emptyResult.includes('undefined'), 'Must not contain undefined');
  assert(!emptyResult.includes('null'), 'Must not contain null');
  assert(!emptyResult.includes('{{'), 'Must not contain {{');
  assert(emptyResult.includes('Hello Customer'), 'Falls back to Customer');
  assert(emptyResult.includes('Our Service Team here'), 'Falls back to Our Service Team');
  assert(emptyResult.includes('Maintenance Service'), 'Falls back to Maintenance Service');
  assert(emptyResult.includes('Vehicle / Reg No.'), 'Falls back to category-specific asset label');
  assert(emptyResult.includes('soon'), 'Falls back to soon');
  console.log('  ✔ Handled missing data gracefully with category-aware fallbacks');

  // Strips unknown tags by default for customer safety
  const strippedUnknown = interpolateTemplate('Hello {{customer_name}}, get {{discount}} off on {{service_name}}!', {
    customer_name: 'Anita',
    service_name: 'RO Filter Replacement',
  });
  assert(!strippedUnknown.includes('{{discount}}'), 'Unknown tag stripped');
  assert.strictEqual(strippedUnknown, 'Hello Anita, get off on RO Filter Replacement!');
  console.log('  ✔ Stripped unknown placeholders in customer messages to avoid raw syntax leakage');

  // Retains unknown tags when stripUnresolvedTags is explicitly false
  const keptUnknown = interpolateTemplate(
    'Hello {{customer_name}}, check {{unknown_tag}}!',
    { customer_name: 'Anita' },
    { stripUnresolvedTags: false }
  );
  assert(keptUnknown.includes('{{unknown_tag}}'), 'Retained unknown tag when requested for editor');
  console.log('  ✔ Retained unknown placeholder for editor inspection when stripUnresolvedTags=false');

  // =========================================================================
  // 3. Template Validation Engine
  // =========================================================================
  console.log('\n--- 3. Template Validation Engine Tests ---');
  const validCheck = validateTemplate('Hi {{customer_name}}, your {{service_name}} is due on {{due_date}}.');
  assert.strictEqual(validCheck.isValid, true);
  assert.strictEqual(validCheck.hasUnclosedTags, false);
  assert.strictEqual(validCheck.unknownTags.length, 0);
  assert.deepStrictEqual(validCheck.usedTags, ['{{customer_name}}', '{{service_name}}', '{{due_date}}']);
  console.log('  ✔ Valid template correctly recognized with all used tags reported');

  const unknownCheck = validateTemplate('Hi {{customer_name}}, claim {{special_offer}} with {{code}}!');
  assert.strictEqual(unknownCheck.isValid, false);
  assert(unknownCheck.unknownTags.includes('{{special_offer}}'));
  assert(unknownCheck.unknownTags.includes('{{code}}'));
  assert(unknownCheck.warnings.length >= 2);
  console.log('  ✔ Unknown placeholders flagged with actionable warnings');

  const unclosedCheck = validateTemplate('Hi {{customer_name, your service is ready.');
  assert.strictEqual(unclosedCheck.isValid, false);
  assert.strictEqual(unclosedCheck.hasUnclosedTags, true);
  console.log('  ✔ Unclosed template placeholder braces identified');

  const emptyCheck = validateTemplate('   ');
  assert.strictEqual(emptyCheck.isValid, false);
  console.log('  ✔ Empty template flagged');

  // =========================================================================
  // 4. Unicode & Malayalam Language Support
  // =========================================================================
  console.log('\n--- 4. Unicode & Malayalam Language Tests ---');
  const malayalamTemplate =
    'നമസ്കാരം {{customer_name}}, {{business_name}}-ൽ നിന്നുള്ള അറിയിപ്പാണ്. നിങ്ങളുടെ {{service_name}} തീയതി {{due_date}} ആണ്. കൂടുതൽ വിവരങ്ങൾക്ക് {{business_phone}} എന്ന നമ്പറിൽ ബന്ധപ്പെടുക. 🚗✨';

  const malayalamVars: TemplateVariables = {
    customer_name: 'സുരേഷ് കുമാർ',
    business_name: 'റോയൽ മോട്ടോഴ്സ്',
    service_name: 'വാഹന സർവീസ്',
    due_date: '2026-10-30',
    business_phone: '+91 98471 23456',
  };

  const malayalamResult = interpolateTemplate(malayalamTemplate, malayalamVars);
  assert(malayalamResult.includes('സുരേഷ് കുമാർ'));
  assert(malayalamResult.includes('റോയൽ മോട്ടോഴ്സ്'));
  assert(malayalamResult.includes('വാഹന സർവീസ്'));
  assert(malayalamResult.includes('30 Oct 2026'));
  assert(malayalamResult.includes('🚗✨'));

  const malayalamLink = generateWhatsAppLink('+91 98471 23456', malayalamResult);
  assert(malayalamLink.startsWith('https://wa.me/919847123456?text='));
  const decodedMalayalam = decodeURIComponent(malayalamLink.split('text=')[1]);
  assert.strictEqual(decodedMalayalam, malayalamResult, 'Decoded Malayalam text matches original exactly');
  console.log('  ✔ Unicode, Malayalam text, and emojis preserved through interpolation and URL encoding');

  // =========================================================================
  // 5. WhatsApp Link Generation & Phone Sanitization
  // =========================================================================
  console.log('\n--- 5. WhatsApp Link Generation & Phone Sanitization Tests ---');
  assert.strictEqual(sanitizeWhatsAppPhone('9847123456'), '919847123456');
  assert.strictEqual(sanitizeWhatsAppPhone('98471 23456'), '919847123456');
  assert.strictEqual(sanitizeWhatsAppPhone('+91 98471-23456'), '919847123456');
  assert.strictEqual(sanitizeWhatsAppPhone('09847123456'), '919847123456');
  assert.strictEqual(sanitizeWhatsAppPhone('919847123456'), '919847123456');
  console.log('  ✔ Phone sanitization handles 10-digit Indian numbers, +91, and leading 0');

  const sampleLink = generateWhatsAppLink('+91 98471 23456', 'Hello World!\nLine 2 & symbols: ₹ 1,500');
  assert(sampleLink.startsWith('https://wa.me/919847123456?text='));
  const decodedSample = decodeURIComponent(sampleLink.replace('https://wa.me/919847123456?text=', ''));
  assert.strictEqual(decodedSample, 'Hello World!\nLine 2 & symbols: ₹ 1,500');
  console.log('  ✔ Correct wa.me URL encoding preserves line breaks, currency symbols, and spaces');

  // =========================================================================
  // 6. Dynamic Preview Category Sample Data
  // =========================================================================
  console.log('\n--- 6. Dynamic Preview Category Sample Data Tests ---');
  for (const bType of BUSINESS_TYPE_OPTIONS) {
    const sample = getCategorySampleData(bType);
    assert(sample.customer_name, `${bType} sample must have customer_name`);
    assert(sample.asset_name, `${bType} sample must have asset_name`);
    assert(sample.service_name, `${bType} sample must have service_name`);
    assert(sample.due_date, `${bType} sample must have due_date`);

    if (bType !== 'Air Conditioning Maintenance') {
      const combined = `${sample.asset_name} ${sample.service_name}`.toLowerCase();
      assert(!combined.includes('air condition'), `Sample for "${bType}" contains "air condition"`);
      assert(!combined.includes('ac periodic'), `Sample for "${bType}" contains "ac periodic"`);
    }
  }

  const vehicleSample = getCategorySampleData('Vehicle Service & Auto Care');
  assert(vehicleSample.asset_name.includes('Hyundai Creta'));
  assert(vehicleSample.service_name.includes('Vehicle Maintenance'));

  const roSample = getCategorySampleData('RO Water Purifier Service');
  assert(roSample.asset_name.includes('Kent Grand+ RO'));
  assert(roSample.service_name.includes('Filter Replacement'));
  console.log('  ✔ Realistic category-specific preview samples provided for all industries');

  // =========================================================================
  // 7. Workspace Scoped Custom Templates & Restore Simulation
  // =========================================================================
  console.log('\n--- 7. Workspace Custom Templates & Restore Defaults Simulation Tests ---');
  const initial = getInitialTemplatesForCategory('Vehicle Service & Auto Care');
  assert.strictEqual(initial.length, 5);

  const customTpl = {
    id: 'tpl-custom-1',
    name: 'Weekend Discount Promo',
    type: 'CUSTOM' as const,
    templateText: 'Hello {{customer_name}}, special weekend vehicle checkup offer!',
  };

  const workspaceTemplates = [...initial, customTpl];
  assert.strictEqual(workspaceTemplates.length, 6);

  // User customized one default
  workspaceTemplates[0].templateText = 'Locally customized overdue notice';

  // Restore defaults preserves custom templates
  const starters = getInitialTemplatesForCategory('Vehicle Service & Auto Care');
  const customOnly = workspaceTemplates.filter(
    (t) => t.type === 'CUSTOM' || t.id.startsWith('tpl-custom-')
  );
  const restored = [...starters, ...customOnly];

  assert.strictEqual(restored.length, 6);
  assert(restored.find((t) => t.id === 'tpl-custom-1'));
  assert.notStrictEqual(
    restored.find((t) => t.type === 'DUE_SOON')?.templateText,
    'Locally customized overdue notice'
  );
  console.log('  ✔ Adding custom templates and restoring defaults safely preserves custom templates');

  console.log('\n================================================================');
  console.log('🎉 ALL 21 WHATSAPP TEMPLATES & PLACEHOLDER ENGINE TESTS PASSED!');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
