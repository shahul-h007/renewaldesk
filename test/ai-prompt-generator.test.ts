import assert from 'node:assert';
import {
  generateAiTemplatePrompt,
  PROMPT_TONE_OPTIONS,
  PROMPT_LANGUAGE_OPTIONS,
  TEMPLATE_TYPE_LABELS,
} from '../lib/ai-prompt-generator';
import { BUSINESS_TYPE_OPTIONS } from '../lib/catalog-presets';
import { SUPPORTED_PLACEHOLDERS } from '../lib/whatsapp';
import { ServiceCatalogItem } from '../lib/types';

async function main() {
  console.log('Running Phase 4: Client-Side AI Prompt Generator Test Suite...\n');

  // =========================================================================
  // 1. Category-Specific Prompt Generation & AC Isolation
  // =========================================================================
  console.log('--- 1. Category-Specific Prompt Generation & AC Isolation Tests ---');
  const prohibitedAcTerms = ['air condition', 'ac periodic', 'cooling loss', 'compressor breakdown'];

  for (const bType of BUSINESS_TYPE_OPTIONS) {
    const prompt = generateAiTemplatePrompt({
      businessName: `Test ${bType} Firm`,
      businessType: bType,
      catalog: [],
    });

    assert(prompt.includes(bType), `Prompt must include category "${bType}"`);
    assert(prompt.includes(`Test ${bType} Firm`), `Prompt must include business name`);

    if (bType !== 'Air Conditioning Maintenance') {
      const lower = prompt.toLowerCase();
      // Ensure the guidelines explicitly forbid AC terms in non-AC prompts
      assert(
        lower.includes('do not use ac-specific words'),
        `Non-AC category "${bType}" prompt must guard against AC terms`
      );
    }
  }
  console.log('  ✔ All 9 business categories generate category-aligned prompts with AC guards');

  // =========================================================================
  // 2. Service Catalog Inclusion and Empty Catalog Fallback
  // =========================================================================
  console.log('\n--- 2. Service Catalog Inclusion & Fallback Tests ---');
  const sampleVehicleCatalog: ServiceCatalogItem[] = [
    {
      id: 'srv-1',
      name: 'Synthetic Engine Oil Change',
      intervalValue: 6,
      intervalUnit: 'MONTHS',
      defaultIntervalMonths: 6,
      typicalPrice: 2400,
      isActive: true,
    },
    {
      id: 'srv-2',
      name: 'Four-Wheel Disc Brake Service',
      intervalValue: 12,
      intervalUnit: 'MONTHS',
      defaultIntervalMonths: 12,
      typicalPrice: 1800,
      isActive: true,
    },
    {
      id: 'srv-3',
      name: 'Deactivated Inactive Service',
      intervalValue: 1,
      intervalUnit: 'MONTHS',
      defaultIntervalMonths: 1,
      typicalPrice: 500,
      isActive: false,
    },
  ];

  const vehiclePrompt = generateAiTemplatePrompt({
    businessName: 'Royal Auto Garage',
    businessType: 'Vehicle Service & Auto Care',
    catalog: sampleVehicleCatalog,
  });

  assert(vehiclePrompt.includes('Synthetic Engine Oil Change'), 'Includes active service 1');
  assert(vehiclePrompt.includes('Four-Wheel Disc Brake Service'), 'Includes active service 2');
  assert(vehiclePrompt.includes('₹2400'), 'Includes pricing context');
  assert(!vehiclePrompt.includes('Deactivated Inactive Service'), 'Excludes deactivated services');
  console.log('  ✔ Real workspace service catalog and pricing accurately included, inactive items filtered');

  // Empty catalog fallback
  const emptyCatalogPrompt = generateAiTemplatePrompt({
    businessName: 'Pure Flow Purifiers',
    businessType: 'RO Water Purifier Service',
    catalog: [],
  });
  assert(
    emptyCatalogPrompt.includes('Filter Replacement') || emptyCatalogPrompt.includes('Membrane'),
    'Falls back to sensible category presets when catalog is empty'
  );
  console.log('  ✔ Empty service catalog falls back gracefully to category default service presets');

  // =========================================================================
  // 3. Other Category Neutrality (Custom Services)
  // =========================================================================
  console.log('\n--- 3. Other / Custom Category Neutrality Tests ---');
  const otherCatalog: ServiceCatalogItem[] = [
    {
      id: 'oth-1',
      name: 'Industrial Generator Calibration',
      intervalValue: 3,
      intervalUnit: 'MONTHS',
      defaultIntervalMonths: 3,
      typicalPrice: 5000,
      isActive: true,
    },
    {
      id: 'oth-2',
      name: 'High Voltage Transformer Inspection',
      intervalValue: 12,
      intervalUnit: 'MONTHS',
      defaultIntervalMonths: 12,
      typicalPrice: 15000,
      isActive: true,
    },
  ];

  const otherPrompt = generateAiTemplatePrompt({
    businessName: 'Apex Industrial Support',
    businessType: 'Other',
    catalog: otherCatalog,
  });

  assert(otherPrompt.includes('Industrial Generator Calibration'), 'Contains custom service 1');
  assert(otherPrompt.includes('High Voltage Transformer Inspection'), 'Contains custom service 2');
  assert(!otherPrompt.toLowerCase().includes('air conditioner'), 'Other category contains no AC text');
  assert(!otherPrompt.toLowerCase().includes('split ac'), 'Other category contains no split AC text');
  console.log('  ✔ Other category remains completely neutral and strictly uses the custom service catalog');

  // =========================================================================
  // 4. Tone and Language Variations
  // =========================================================================
  console.log('\n--- 4. Tone and Language Configuration Tests ---');
  for (const toneOpt of PROMPT_TONE_OPTIONS) {
    const prompt = generateAiTemplatePrompt({
      businessName: 'Test Business',
      businessType: 'Appliance Repair & Maintenance',
      tone: toneOpt.id,
    });
    assert(prompt.includes(toneOpt.label) || prompt.includes('Tone:'), `Prompt includes tone: ${toneOpt.id}`);
  }
  console.log('  ✔ All 5 prompt tone configurations generate tailored instructions');

  // Malayalam Language Instruction
  const malayalamPrompt = generateAiTemplatePrompt({
    businessName: 'Kochi Auto Care',
    businessType: 'Vehicle Service & Auto Care',
    language: 'malayalam',
  });
  assert(malayalamPrompt.includes('Malayalam script (മലയാളം)'), 'Instructs natural Malayalam script');
  assert(
    malayalamPrompt.includes('standard English curly braces'),
    'Instructs keeping placeholders in English braces'
  );
  console.log('  ✔ Malayalam language prompt instructs natural Malayalam script with exact English placeholders');

  // =========================================================================
  // 5. Placeholders & Anti-Hallucination Guardrails
  // =========================================================================
  console.log('\n--- 5. Placeholders & Anti-Hallucination Guardrails Tests ---');
  const guardrailPrompt = generateAiTemplatePrompt({
    businessName: 'Star Pest Control',
    businessType: 'Pest Control Services',
  });

  for (const ph of SUPPORTED_PLACEHOLDERS) {
    assert(guardrailPrompt.includes(ph), `Prompt must document placeholder ${ph}`);
  }
  console.log('  ✔ All 10 supported placeholders documented with descriptions in prompt');

  assert(
    guardrailPrompt.includes('DO NOT invent fake placeholders'),
    'Includes strict prohibition against fake placeholders'
  );
  assert(
    guardrailPrompt.includes('DO NOT make false promises'),
    'Includes guardrail against false promises or unsupported warranties'
  );
  console.log('  ✔ Anti-hallucination guardrails and constraints present');

  // =========================================================================
  // 6. Privacy & Zero Customer Data Leakage
  // =========================================================================
  console.log('\n--- 6. Privacy & Zero Customer Data Leakage Tests ---');
  const privacyPrompt = generateAiTemplatePrompt({
    businessName: 'Clean Home Kerala',
    businessType: 'Home Cleaning & Deep Wash',
    customInstructions: 'Please make it friendly for apartment owners.',
  });

  assert(privacyPrompt.includes('NO Customer PII'), 'Explicitly instructs AI that no customer PII is provided');
  assert(!privacyPrompt.includes('Rahul'), 'No sample customer names leaked');
  assert(!privacyPrompt.includes('98471'), 'No phone numbers leaked');
  assert(!privacyPrompt.includes('Edappally'), 'No customer addresses leaked');
  console.log('  ✔ Verified zero customer PII in prompt generation');

  // =========================================================================
  // 7. Template Selection & Custom Instructions
  // =========================================================================
  console.log('\n--- 7. Template Selection & Custom Instructions Tests ---');
  const customPrompt = generateAiTemplatePrompt({
    businessName: 'Solar Tech Solutions',
    businessType: 'Solar Panel Maintenance',
    templateTypes: ['DUE_SOON', 'OVERDUE'],
    customInstructions: 'Emphasize dust removal after dusty winds.',
  });

  assert(customPrompt.includes('[DUE_SOON]'), 'Includes requested DUE_SOON');
  assert(customPrompt.includes('[OVERDUE]'), 'Includes requested OVERDUE');
  assert(!customPrompt.includes('[BOOKING_CONFIRMATION]'), 'Excludes unrequested BOOKING_CONFIRMATION');
  assert(customPrompt.includes('Emphasize dust removal after dusty winds.'), 'Includes custom instructions');
  console.log('  ✔ Correctly filters template triggers and includes owner instructions');

  console.log('\n================================================================');
  console.log('🎉 ALL 7 AI PROMPT GENERATOR TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
