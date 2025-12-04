import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { config, validateConfig } from './config.js';
import healthRoutes from './routes/health.js';
import jobsRoutes from './routes/jobs.js';

// Validate configuration at startup
try {
  validateConfig();
} catch (error) {
  console.error('Configuration error:', error instanceof Error ? error.message : error);
  process.exit(1);
}

// Create Hono app
const app = new Hono();

// Register routes
app.route('/health', healthRoutes);
app.route('/jobs', jobsRoutes);

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json(
    {
      error: 'Internal server error',
      message: err.message,
    },
    500
  );
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not found',
      message: `Path ${c.req.path} not found`,
    },
    404
  );
});

// Start server
const port = config.PORT;

console.log(`Starting Claude Parallel API server...`);
console.log(`Port: ${port}`);
console.log(`Work directory: ${config.WORK_DIR}`);
console.log(`Job timeout: ${config.JOB_TIMEOUT}ms`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`Server listening on http://localhost:${port}`);
console.log(`Health check: http://localhost:${port}/health`);
console.log(`Submit jobs: POST http://localhost:${port}/jobs`);
