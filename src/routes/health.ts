import { Hono } from 'hono';
import type { HealthResponse } from '../types.js';

const health = new Hono();

/**
 * GET /health - Health check endpoint
 * Returns 200 OK with status message
 */
health.get('/', (c) => {
  const response: HealthResponse = {
    status: 'ok',
  };
  return c.json(response, 200);
});

export default health;
