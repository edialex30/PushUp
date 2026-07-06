import https from 'node:https';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { networkInterfaces } from 'node:os';
import express from 'express';
import { createStorage } from './src/storage.js';
import { createApiRouter } from './src/api.js';
import { loadOrCreateCert } from './src/cert.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3443;

const store = createStorage(join(__dirname, 'data', 'history.json'));
const { key, cert } = loadOrCreateCert(join(__dirname, 'certs'));

const app = express();
app.use(express.json());
app.use('/api', createApiRouter({ store }));
app.use(express.static(join(__dirname, 'public')));

https.createServer({ key, cert }, app).listen(PORT, '0.0.0.0', () => {
  console.log('\n  PushUp Counter pornit!\n');
  console.log('  Deschide pe telefon (aceeași rețea Wi-Fi):');
  for (const list of Object.values(networkInterfaces())) {
    for (const iface of list || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`    https://${iface.address}:${PORT}`);
      }
    }
  }
  console.log(`    https://localhost:${PORT}  (pe laptop)\n`);
  console.log('  Prima accesare: acceptă avertismentul de certificat.\n');
});
