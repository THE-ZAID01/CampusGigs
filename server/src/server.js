const app = require('./app');
const env = require('./config/env');
const { pool } = require('./config/db');

pool
  .query('SELECT 1')
  .then(() => {
    app.listen(env.port, () => console.log(`CampusGigs API running on http://localhost:${env.port}`));
  })
  .catch((e) => {
    console.error('\nCould not connect to PostgreSQL:', e.message);
    console.error('Check DATABASE_URL in server/.env and that Postgres is running, then run: npm run db:setup\n');
    process.exit(1);
  });
