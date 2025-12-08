/**
 * Test file for timestamp utility
 * Tests the getTimestamp() function
 */

const { getTimestamp } = require('./timestamp');

// Test 1: Function exists and is callable
try {
  if (typeof getTimestamp !== 'function') {
    console.error('FAIL: getTimestamp is not a function');
    process.exit(1);
  }
  console.log('PASS: getTimestamp is a function');
} catch (error) {
  console.error('FAIL: Could not verify getTimestamp is a function:', error.message);
  process.exit(1);
}

// Test 2: Function returns a string
try {
  const timestamp = getTimestamp();
  if (typeof timestamp !== 'string') {
    console.error('FAIL: getTimestamp() did not return a string');
    process.exit(1);
  }
  console.log('PASS: getTimestamp() returns a string');
} catch (error) {
  console.error('FAIL: Could not call getTimestamp():', error.message);
  process.exit(1);
}

// Test 3: Return value matches ISO 8601 format pattern
try {
  const timestamp = getTimestamp();
  const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

  if (!isoPattern.test(timestamp)) {
    console.error('FAIL: Timestamp does not match ISO 8601 format pattern');
    console.error('  Expected pattern: YYYY-MM-DDTHH:mm:ss.sssZ');
    console.error('  Actual value:', timestamp);
    process.exit(1);
  }
  console.log('PASS: Timestamp matches ISO 8601 format pattern');
  console.log('  Value:', timestamp);
} catch (error) {
  console.error('FAIL: Could not validate ISO 8601 format:', error.message);
  process.exit(1);
}

// Test 4: Timestamp is current (within reasonable bounds)
try {
  const timestamp = getTimestamp();
  const now = Date.now();
  const timestampMs = new Date(timestamp).getTime();
  const timeDiff = Math.abs(now - timestampMs);

  // Allow 5 seconds difference (generous for slow systems)
  if (timeDiff > 5000) {
    console.error('FAIL: Timestamp is not current');
    console.error('  Time difference:', timeDiff, 'ms');
    process.exit(1);
  }
  console.log('PASS: Timestamp is current (within 5 seconds)');
} catch (error) {
  console.error('FAIL: Could not validate timestamp is current:', error.message);
  process.exit(1);
}

// All tests passed
console.log('\n✓ All tests passed!');
process.exit(0);
