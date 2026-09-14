const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not set. Copy .env.example -> .env and set DATABASE_URL');
    process.exit(2);
  }
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    // ensure migrations table
    await client.query(`CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMP WITH TIME ZONE DEFAULT now())`);

    const migrationsDir = path.join(__dirname);
    const files = fs.readdirSync(migrationsDir).filter(f => f.match(/^\d+_.*\.sql$/)).sort();

    for (const file of files) {
      const name = file;
      const res = await client.query('SELECT 1 FROM migrations WHERE name = $1', [name]);
      if (res.rowCount > 0) {
        console.log(`${name} already applied, skipping`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log(`Applying migration ${name} ...`);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO migrations(name) VALUES($1)', [name]);
        await client.query('COMMIT');
        console.log(`Applied ${name}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Failed to apply ${name}:`, err.message || err);
        process.exit(3);
      }
    }

    console.log('Migrations completed');
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


