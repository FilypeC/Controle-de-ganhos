import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { createApiHandler } from './src/backend.js';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const distDirectory = resolve(projectRoot, 'dist');
const isDevelopment = process.argv.includes('--dev');
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || '127.0.0.1';
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('A variável PORT deve ser um número entre 1 e 65535.');
}

const apiHandler = createApiHandler();
let vite = null;
const server = createServer((request, response) => {
  try {
    apiHandler(request, response, () => {
      const pathname = new URL(request.url || '/', 'http://localhost').pathname;
      if (pathname.startsWith('/api/')) {
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.statusCode = 404;
        response.end(JSON.stringify({ error: 'Rota não encontrada.' }));
        return;
      }

      void serveFrontend(request, response).catch((error) => {
        console.error('Erro ao servir a interface:', error);
        if (!response.headersSent) {
          response.statusCode = 500;
          response.end('Erro interno do servidor.');
        } else {
          response.destroy(error);
        }
      });
    });
  } catch (error) {
    console.error('Erro ao processar a requisição:', error);
    if (!response.headersSent) {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.statusCode = 500;
      response.end(JSON.stringify({ error: 'Erro interno do servidor.' }));
    } else {
      response.destroy(error);
    }
  }
});

if (isDevelopment) {
  vite = await createViteServer({
    configFile: resolve(projectRoot, 'vite.config.js'),
    root: projectRoot,
    server: { middlewareMode: { server } },
    appType: 'spa',
  });
}

async function serveFrontend(request, response) {
  if (vite) {
    vite.middlewares(request, response, () => {
      if (!response.writableEnded) {
        response.statusCode = 404;
        response.end('Não encontrado.');
      }
    });
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    response.statusCode = 405;
    response.end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
  } catch {
    response.statusCode = 400;
    response.end('Endereço inválido.');
    return;
  }

  const filePath = resolve(distDirectory, `.${pathname}`);
  if (filePath !== distDirectory && !filePath.startsWith(`${distDirectory}${sep}`)) {
    response.statusCode = 403;
    response.end('Acesso negado.');
    return;
  }

  let content;
  let resolvedPath = filePath;
  try {
    content = await readFile(resolvedPath);
  } catch (error) {
    if (error.code !== 'ENOENT' && error.code !== 'EISDIR') throw error;
    if (extname(pathname)) {
      response.statusCode = 404;
      response.end('Não encontrado.');
      return;
    }

    resolvedPath = resolve(distDirectory, 'index.html');
    content = await readFile(resolvedPath);
  }

  response.statusCode = 200;
  response.setHeader(
    'Content-Type',
    contentTypes[extname(resolvedPath)] || 'application/octet-stream',
  );
  response.setHeader('Content-Length', content.length);
  response.end(request.method === 'HEAD' ? undefined : content);
}

server.listen(port, host, () => {
  console.log(`Servidor Node.js disponível em http://${host}:${port}`);
});

function closeServer() {
  server.close(() => {
    apiHandler.close();
    if (vite) void vite.close();
  });
}

process.once('SIGINT', closeServer);
process.once('SIGTERM', closeServer);
