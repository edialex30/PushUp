import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { networkInterfaces } from 'node:os';
import selfsigned from 'selfsigned';

function localIps() {
  const ips = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const iface of list || []) {
      if (iface.family === 'IPv4' && !iface.internal) ips.push(iface.address);
    }
  }
  return ips;
}

export function loadOrCreateCert(dir) {
  const keyPath = join(dir, 'key.pem');
  const certPath = join(dir, 'cert.pem');
  if (existsSync(keyPath) && existsSync(certPath)) {
    return { key: readFileSync(keyPath, 'utf8'), cert: readFileSync(certPath, 'utf8') };
  }
  mkdirSync(dir, { recursive: true });
  const altNames = [
    { type: 2, value: 'localhost' },
    { type: 7, ip: '127.0.0.1' },
    ...localIps().map(ip => ({ type: 7, ip })),
  ];
  const pems = selfsigned.generate(
    [{ name: 'commonName', value: 'pushup-counter' }],
    { days: 3650, keySize: 2048, altNames }
  );
  writeFileSync(keyPath, pems.private);
  writeFileSync(certPath, pems.cert);
  return { key: pems.private, cert: pems.cert };
}
