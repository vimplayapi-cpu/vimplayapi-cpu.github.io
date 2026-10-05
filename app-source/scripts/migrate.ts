import { openDb, migrate } from '../src/lib/db/client';

const db = openDb();
const applied = migrate(db);
console.log(applied.length ? `applied: ${applied.join(', ')}` : 'up to date');
db.close();
