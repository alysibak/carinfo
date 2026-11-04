/**
 * Recall alerts by hand, as the daily cron call runs them.
 *
 *   npm run recall-alerts --workspace=server -- --dry-run   who would get what; sends nothing
 *   npm run recall-alerts --workspace=server                 sends
 *
 * Reads the repo's .env like the server. A dry run notes nothing, so the
 * next real run still sends what it listed.
 */
import dotenv from 'dotenv';
import path from 'path';
import { getPool, isDatabaseConfigured } from '../src/db/pool.js';
import { runRecallAlerts } from '../src/services/recall-alerts.service.js';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const run = await runRecallAlerts({ dryRun, budgetMs: Number.POSITIVE_INFINITY });
  console.log(JSON.stringify(run, null, 2));
  if (isDatabaseConfigured()) await getPool().end();
  process.exit(run.ran && run.failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
