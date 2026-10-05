import { sessionCookieName, sessionDurationMs } from './auth.js';

export function sendJson(response, statusCode, value) {
  response.statusCode = statusCode;
  response.end(JSON.stringify(value));
}

export function setSessionCookie(response, token, request) {
  const secure = request.socket.encrypted ? '; Secure' : '';
  response.setHeader(
    'Set-Cookie',
    `${sessionCookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${sessionDurationMs / 1000}${secure}`,
  );
}

export function clearSessionCookie(response, request) {
  const secure = request.socket.encrypted ? '; Secure' : '';
  response.setHeader(
    'Set-Cookie',
    `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`,
  );
}

export function readJsonRequest(request) {
  return new Promise((resolveBody, rejectBody) => {
    let body = '';
    let tooLarge = false;
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      if (tooLarge) return;
      body += chunk;
      if (Buffer.byteLength(body) > 100_000) tooLarge = true;
    });
    request.on('error', rejectBody);
    request.on('end', () => {
      if (tooLarge) {
        rejectBody(Object.assign(new Error('Os dados enviados são muito grandes.'), { statusCode: 413 }));
        return;
      }

      try {
        const values = JSON.parse(body);
        if (values === null || typeof values !== 'object' || Array.isArray(values)) {
          throw new Error('Os dados enviados são inválidos.');
        }
        resolveBody(values);
      } catch {
        rejectBody(Object.assign(new Error('Os dados enviados são inválidos.'), { statusCode: 400 }));
      }
    });
  });
}
