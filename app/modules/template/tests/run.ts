import { runSandbox } from './sync-sandbox';

runSandbox().catch((err) => {
  console.error('Sandbox run failed:', err);
  process.exit(1);
});
