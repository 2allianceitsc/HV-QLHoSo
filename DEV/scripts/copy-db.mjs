/**
 * Copy all data from SOURCE → TARGET PostgreSQL database.
 * Both DBs must already have the same schema (run migrations first on target).
 *
 * Usage:
 *   node scripts/copy-db.mjs <SOURCE_URL> <TARGET_URL>
 */

import pg from 'pg';
const { Client } = pg;

const [, , SOURCE_URL, TARGET_URL] = process.argv;

if (!SOURCE_URL || !TARGET_URL) {
  console.error('Usage: node scripts/copy-db.mjs <SOURCE_URL> <TARGET_URL>');
  process.exit(1);
}

const src = new Client({ connectionString: SOURCE_URL });
const dst = new Client({ connectionString: TARGET_URL });

async function getTables(client) {
  const { rows } = await client.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('_prisma_migrations')
    ORDER BY tablename
  `);
  return rows.map(r => r.tablename);
}

async function getRowCount(client, table) {
  const { rows } = await client.query(`SELECT COUNT(*) FROM "${table}"`);
  return parseInt(rows[0].count, 10);
}

async function copyTable(srcClient, dstClient, table) {
  const { rows } = await srcClient.query(`SELECT * FROM "${table}"`);
  if (rows.length === 0) return 0;

  const cols = Object.keys(rows[0]).map(c => `"${c}"`).join(', ');
  const placeholders = Object.keys(rows[0]).map((_, i) => `$${i + 1}`).join(', ');

  for (const row of rows) {
    const values = Object.values(row);
    await dstClient.query(
      `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
      values,
    );
  }
  return rows.length;
}

async function main() {
  console.log('Connecting to source and target...');
  await src.connect();
  await dst.connect();

  const tables = await getTables(src);
  console.log(`Found ${tables.length} tables: ${tables.join(', ')}\n`);

  // Bypass FK constraints during import
  await dst.query(`SET session_replication_role = 'replica'`);

  let totalCopied = 0;
  for (const table of tables) {
    const srcCount = await getRowCount(src, table);
    if (srcCount === 0) {
      console.log(`  [skip] ${table} — empty`);
      continue;
    }
    process.stdout.write(`  [copy] ${table} (${srcCount} rows)...`);
    try {
      const copied = await copyTable(src, dst, table);
      console.log(` done (${copied})`);
      totalCopied += copied;
    } catch (err) {
      console.log(` ERROR: ${err.message}`);
    }
  }

  await dst.query(`SET session_replication_role = 'origin'`);

  console.log(`\nDone. Total rows copied: ${totalCopied}`);
  await src.end();
  await dst.end();
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
