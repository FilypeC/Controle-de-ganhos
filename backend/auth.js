import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const sessionCookieName = 'tabela_ganhos_session';
export const sessionDurationMs = 8 * 60 * 60 * 1000;

export function hashPassword(password) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${scryptSync(password, salt, 64).toString('hex')}`;
}

export function verifyPassword(password, storedHash) {
  const [algorithm, saltHex, hashHex, ...extra] = storedHash.split('$');
  if (
    algorithm !== 'scrypt' ||
    !/^[a-f\d]{32}$/i.test(saltHex || '') ||
    !/^[a-f\d]{128}$/i.test(hashHex || '') ||
    extra.length > 0
  ) {
    return false;
  }

  const actualHash = scryptSync(password, Buffer.from(saltHex, 'hex'), 64);
  return timingSafeEqual(actualHash, Buffer.from(hashHex, 'hex'));
}

export function getSessionToken(request) {
  const cookie = String(request.headers.cookie || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${sessionCookieName}=`));
  return cookie?.slice(sessionCookieName.length + 1) || '';
}

export function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function getAuthenticatedAccount(database, request) {
  const token = getSessionToken(request);
  if (!/^[a-f\d]{64}$/i.test(token)) return null;

  const session = database
    .prepare(`
      SELECT contas.id, contas.tipo_conta, sessoes.token_hash
      FROM sessoes
      JOIN contas ON contas.id = sessoes.conta_id
      WHERE sessoes.token_hash = ? AND sessoes.expires_at > ?
    `)
    .get(hashSessionToken(token), new Date().toISOString());
  return session || null;
}
