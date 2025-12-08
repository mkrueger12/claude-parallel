/**
 * Timestamp utility function
 * Returns the current date/time in ISO 8601 format
 */

function getTimestamp() {
  return new Date().toISOString();
}

module.exports = { getTimestamp };
