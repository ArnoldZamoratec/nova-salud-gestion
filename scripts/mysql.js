// Arranca MySQL (XAMPP) si no está corriendo y espera a que acepte conexiones.
const net = require('net');
const fs = require('fs');
const { spawn } = require('child_process');

const PORT = 3306;
const XAMPP = 'C:\\xampp\\mysql\\bin';

const abierto = () =>
  new Promise((resolve) => {
    const s = net.connect(PORT, '127.0.0.1');
    s.once('connect', () => { s.destroy(); resolve(true); });
    s.once('error', () => resolve(false));
  });

(async () => {
  if (await abierto()) return console.log('✔ MySQL ya está corriendo');

  const exe = `${XAMPP}\\mysqld.exe`;
  if (!fs.existsSync(exe)) {
    console.error('✖ MySQL no está corriendo y no se encontró XAMPP en C:\\xampp. Inícialo manualmente.');
    process.exit(1);
  }

  console.log('… Iniciando MySQL de XAMPP');
  spawn(exe, [`--defaults-file=${XAMPP}\\my.ini`, '--standalone'], {
    cwd: XAMPP,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  }).unref();

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await abierto()) return console.log('✔ MySQL listo');
  }
  console.error('✖ MySQL no respondió. Revisa XAMPP o si el puerto 3306 está ocupado.');
  process.exit(1);
})();
