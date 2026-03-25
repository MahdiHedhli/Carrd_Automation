/**
 * Basic tests for Carrd Automation
 *
 * These tests verify the module structure loads correctly.
 * Full integration tests require Carrd credentials and a live browser.
 */

import assert from 'node:assert';
import { CarrdAutomation } from '../src/carrd-automation.js';

console.log('Running Carrd Automation tests...\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${error.message}`);
    failed++;
  }
}

// ─── Unit Tests ──────────────────────────────────────────────

test('CarrdAutomation class can be instantiated', () => {
  const carrd = new CarrdAutomation();
  assert.ok(carrd);
  assert.strictEqual(carrd.headless, true);
});

test('CarrdAutomation accepts custom options', () => {
  const carrd = new CarrdAutomation({
    email: 'test@example.com',
    password: 'secret',
    headless: false,
    slowMo: 100,
    screenshotDir: '/tmp/test-screenshots',
  });
  assert.strictEqual(carrd.email, 'test@example.com');
  assert.strictEqual(carrd.password, 'secret');
  assert.strictEqual(carrd.headless, false);
  assert.strictEqual(carrd.slowMo, 100);
  assert.strictEqual(carrd.screenshotDir, '/tmp/test-screenshots');
});

test('CarrdAutomation starts with null browser state', () => {
  const carrd = new CarrdAutomation();
  assert.strictEqual(carrd.browser, null);
  assert.strictEqual(carrd.context, null);
  assert.strictEqual(carrd.page, null);
});

test('Login throws without credentials', async () => {
  const carrd = new CarrdAutomation({ email: '', password: '' });
  try {
    await carrd.login();
    assert.fail('Should have thrown');
  } catch (error) {
    assert.ok(error.message.includes('CARRD_EMAIL'));
  }
});

test('Close is safe to call without browser', async () => {
  const carrd = new CarrdAutomation();
  await carrd.close(); // should not throw
  assert.ok(true);
});

// ─── Summary ─────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
