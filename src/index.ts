import { serve } from '@hono/node-server';
import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => {
  return c.json({
    message: 'Claude Parallel API',
    version: '1.0.0'
  });
});

const port = parseInt(process.env.PORT || '3000', 10);

console.log(`Starting server on port ${port}...`);

serve({
  fetch: app.fetch,
  port
});

console.log(`Server running at http://localhost:${port}`);
