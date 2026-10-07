import { createApp } from './app.js';
import { config } from './core/config.js';
import { one, openDatabase } from './db/connection.js';
import { seed } from './db/seed.js';

openDatabase();

if (one('SELECT COUNT(*) AS count FROM users').count === 0) {
  console.log('Empty database: loading demo data...');
  seed();
}

createApp().listen(config.port, () => {
  console.log(`${config.store.name} API running on http://localhost:${config.port}`);
});
