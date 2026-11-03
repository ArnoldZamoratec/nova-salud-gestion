// Instala la base de datos ejecutando el script único database/nova_salud.sql
//   npm run db:init           → instala solo si la base no existe
//   npm run db:init -- --reset → la borra y la vuelve a crear con los datos de ejemplo
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQL = path.resolve(__dirname, '../../../database/nova_salud.sql');
const DB = 'botica_nova_salud';
const reset = process.argv.includes('--reset');

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
});

try {
  const [existe] = await conn.query('SHOW DATABASES LIKE ?', [DB]);
  if (existe.length && !reset) {
    console.log(`✔ La base ${DB} ya existe. Para reinstalarla desde cero: npm run db:init -- --reset`);
  } else {
    console.log(`→ Instalando ${DB} desde database/nova_salud.sql...`);
    await conn.query(await fs.readFile(SQL, 'utf8'));
    console.log('✔ Base de datos lista.');
    console.log('   admin@novasalud.pe / Admin123*');
    console.log('   farmaceutico@novasalud.pe / Farma123*');
  }
} catch (err) {
  console.error('✖ Error instalando la base de datos:', err.message);
  process.exitCode = 1;
} finally {
  await conn.end();
}
