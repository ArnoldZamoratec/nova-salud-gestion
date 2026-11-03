// Instala dependencias de la raíz, backend y frontend si faltan.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const raiz = path.join(__dirname, '..');
for (const dir of ['.', 'backend', 'frontend']) {
  const carpeta = path.join(raiz, dir);
  if (!fs.existsSync(path.join(carpeta, 'node_modules'))) {
    console.log(`… Instalando dependencias en ${dir === '.' ? 'la raíz' : dir}`);
    execSync('npm install', { cwd: carpeta, stdio: 'inherit' });
  }
}
