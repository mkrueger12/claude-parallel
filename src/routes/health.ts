/**
 * Health Check Route
 *
 * Provides a simple health check endpoint to verify the API is running.
 */

import { Hono } from 'hono';

const health = new Hono();

/**
 * GET /health
 *
 * Returns the health status of the API server.
 *
 * Response:
 * - 200 OK: { status: 'ok', timestamp: ISO string }
 */
health.get('/', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default health;
