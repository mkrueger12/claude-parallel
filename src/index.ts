/**
 * Server Entry Point
 *
 * Main HTTP server for the Claude Parallel API.
 * Handles job creation and status queries for parallel implementations.
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import jobsRouter from './routes/jobs.js';
import healthRouter from './routes/health.js';

// ============================================================================
// Create Hono App
// ============================================================================

const app = new Hono();

// ============================================================================
// Mount Routes
// ============================================================================

app.route('/jobs', jobsRouter);
app.route('/health', healthRouter);

// Root endpoint
app.get('/', (c) => {
  return c.json({
    message: 'Claude Parallel API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      jobs: {
        create: 'POST /jobs',
        status: 'GET /jobs/:id',
      },
    },
  });
});

// ============================================================================
// Global Error Handler
// ============================================================================

app.onError((err, c) => {
  console.error('Unhandled error:', err);

  return c.json(
    {
      error: 'Internal server error',
      message: err.message || 'An unexpected error occurred',
    },
    500
  );
});

// ============================================================================
// Start Server
// ============================================================================

const port = parseInt(process.env.PORT || '3000', 10);

console.log(`Starting Claude Parallel API server...`);
console.log(`Port: ${port}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`Server running at http://localhost:${port}`);
console.log(`Health check: http://localhost:${port}/health`);
console.log(`API documentation: http://localhost:${port}/`);
