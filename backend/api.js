import {
  getSessionToken,
  getAuthenticatedAccount,
  hashPassword,
  hashSessionToken,
  sessionDurationMs,
  verifyPassword,
} from './auth.js';
import { clearSessionCookie, readJsonRequest, sendJson, setSessionCookie } from './http.js';
import { calculateDailyTotals, escapeCsvCell, isValidDate } from './reports.js';
import { createDailyWorkbook } from './workbook.js';
import { createDatabase } from './database.js';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function createApiHandler() {
    const projectRoot = fileURLToPath(new URL('../', import.meta.url));
    const database = createDatabase(
      process.env.DATABASE_PATH || resolve(projectRoot, 'entregas.db'),
    );
    const dummyPasswordHash = hashPassword(randomBytes(32).toString('hex'));

    const insertDelivery = database.prepare(
      'INSERT INTO entregas (data, quantidade_entregas, saida, nota) VALUES (?, ?, ?, ?)',
    );
    const saveDailyGain = database.prepare(`
      INSERT INTO ganho_diario (data, quantidade_entregas, ganho_diario)
      VALUES (?, ?, ?)
      ON CONFLICT(data) DO UPDATE SET
        quantidade_entregas = excluded.quantidade_entregas,
        ganho_diario = excluded.ganho_diario
    `);

    const handler = (request, response, next) => {
      const pathname = new URL(request.url || '/', 'http://localhost').pathname;

      if (
        pathname === '/api/login' ||
        pathname === '/api/sessao' ||
        pathname === '/api/logout' ||
        pathname === '/api/contas'
      ) {
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        const methods = {
          '/api/login': ['POST'],
          '/api/sessao': ['GET'],
          '/api/logout': ['POST'],
          '/api/contas': ['GET', 'POST', 'DELETE'],
        };

        if (!methods[pathname].includes(request.method)) {
          response.setHeader('Allow', methods[pathname].join(', '));
          sendJson(response, 405, { error: 'Método não permitido.' });
          return;
        }

        if (pathname === '/api/sessao') {
          const account = getAuthenticatedAccount(database, request);
          if (!account) {
            sendJson(response, 401, { error: 'Faça login para continuar.' });
            return;
          }
          sendJson(response, 200, { id: account.id, tipoConta: account.tipo_conta });
          return;
        }

        let authenticatedAccountId = '';
        if (pathname === '/api/contas') {
          const account = getAuthenticatedAccount(database, request);
          if (!account) {
            sendJson(response, 401, { error: 'Faça login para acessar as contas.' });
            return;
          }
          if (account.tipo_conta !== 'ADM') {
            sendJson(response, 403, { error: 'Apenas contas ADM podem acessar as contas.' });
            return;
          }

          if (request.method === 'GET') {
            try {
              const accounts = database
                .prepare('SELECT id, tipo_conta AS tipoConta FROM contas ORDER BY id COLLATE NOCASE')
                .all();
              sendJson(response, 200, accounts);
            } catch (error) {
              console.error('Erro ao consultar contas:', error);
              sendJson(response, 500, { error: 'Não foi possível carregar a lista de contas.' });
            }
            return;
          }

          if (request.method === 'DELETE') {
            authenticatedAccountId = account.id;
          }
        }

        void (async () => {
          try {
            const values = await readJsonRequest(request);

            if (pathname === '/api/login') {
              const id = typeof values.id === 'string' ? values.id.trim() : '';
              const password = typeof values.senha === 'string' ? values.senha : '';
              if (!id || id.length > 64 || !password || password.length > 256) {
                sendJson(response, 400, { error: 'Informe um ID e uma senha válidos.' });
                return;
              }

              const account = database
                .prepare('SELECT id, senha_hash, tipo_conta FROM contas WHERE id = ?')
                .get(id);
              const validPassword = verifyPassword(
                password,
                account?.senha_hash || dummyPasswordHash,
              );
              if (!account || !validPassword) {
                sendJson(response, 401, { error: 'ID ou senha incorretos.' });
                return;
              }

              const token = randomBytes(32).toString('hex');
              const expiresAt = new Date(Date.now() + sessionDurationMs).toISOString();
              database
                .prepare('INSERT INTO sessoes (token_hash, conta_id, expires_at) VALUES (?, ?, ?)')
                .run(hashSessionToken(token), account.id, expiresAt);
              setSessionCookie(response, token, request);
              sendJson(response, 200, { id: account.id, tipoConta: account.tipo_conta });
              return;
            }

            if (pathname === '/api/logout') {
              const token = getSessionToken(request);
              if (/^[a-f\d]{64}$/i.test(token)) {
                database.prepare('DELETE FROM sessoes WHERE token_hash = ?').run(hashSessionToken(token));
              }
              clearSessionCookie(response, request);
              sendJson(response, 200, { message: 'Sessão encerrada.' });
              return;
            }

            if (pathname === '/api/contas' && request.method === 'DELETE') {
              const id = typeof values.id === 'string' ? values.id.trim() : '';
              if (!id || id.length > 64) {
                sendJson(response, 400, { error: 'Informe um ID válido para deletar.' });
                return;
              }
              if (id === authenticatedAccountId) {
                sendJson(response, 400, { error: 'Não é possível deletar a conta ADM em uso.' });
                return;
              }

              const result = database.prepare('DELETE FROM contas WHERE id = ?').run(id);
              if (result.changes === 0) {
                sendJson(response, 404, { error: 'A conta informada não foi encontrada.' });
                return;
              }
              sendJson(response, 200, { id, message: 'Conta deletada com sucesso.' });
              return;
            }

            const id = typeof values.id === 'string' ? values.id.trim() : '';
            const password = typeof values.senha === 'string' ? values.senha : '';
            const accountType = values.tipoConta;
            if (!id || id.length > 64) {
              sendJson(response, 400, { error: 'O ID deve ter entre 1 e 64 caracteres.' });
              return;
            }
            if (password.length < 8 || password.length > 256) {
              sendJson(response, 400, { error: 'A senha deve ter pelo menos 8 caracteres.' });
              return;
            }
            if (accountType !== 'ADM' && accountType !== 'USUARIO') {
              sendJson(response, 400, { error: 'Selecione um tipo de conta válido.' });
              return;
            }

            try {
              database
                .prepare('INSERT INTO contas (id, senha_hash, tipo_conta) VALUES (?, ?, ?)')
                .run(id, hashPassword(password), accountType);
            } catch (error) {
              if (error.errcode === 1555 || error.errcode === 2067) {
                sendJson(response, 409, { error: 'Já existe uma conta com este ID.' });
                return;
              }
              throw error;
            }
            sendJson(response, 201, { id, tipoConta: accountType });
          } catch (error) {
            if (error.statusCode) {
              sendJson(response, error.statusCode, { error: error.message });
              return;
            }
            console.error('Erro ao processar autenticação ou cadastro:', error);
            sendJson(response, 500, { error: 'Não foi possível concluir a operação.' });
          }
        })();
        return;
      }

      if (
        pathname !== '/api/entregas' &&
        pathname !== '/api/entregas/periodo' &&
        pathname !== '/api/ganho-diario' &&
        pathname !== '/api/ganho-diario/periodo' &&
        pathname !== '/api/ganho-diario/periodo/planilha' &&
        pathname !== '/api/ganho-diario/mes'
      ) {
        next();
        return;
      }

      response.setHeader('Content-Type', 'application/json; charset=utf-8');

      if (pathname === '/api/entregas/periodo' && request.method === 'DELETE') {
        const account = getAuthenticatedAccount(database, request);
        if (!account) {
          sendJson(response, 401, { error: 'Faça login para deletar dados.' });
          return;
        }
        if (account.tipo_conta !== 'ADM') {
          sendJson(response, 403, { error: 'Apenas contas ADM podem deletar dados.' });
          return;
        }
      }

      if (request.method === 'GET' && pathname === '/api/entregas') {
        try {
          const records = database
            .prepare(
              'SELECT data, quantidade_entregas, saida, nota FROM entregas ORDER BY data DESC, rowid DESC',
            )
            .all();
          response.statusCode = 200;
          response.end(JSON.stringify(records));
        } catch (error) {
          console.error('Erro ao consultar entregas:', error);
          response.statusCode = 500;
          response.end(JSON.stringify({ error: 'Erro ao carregar os dados do banco.' }));
        }
        return;
      }

      if (
        (pathname === '/api/entregas' && request.method !== 'GET' && request.method !== 'POST') ||
        (pathname === '/api/entregas/periodo' && request.method !== 'DELETE') ||
        (pathname !== '/api/entregas' &&
          pathname !== '/api/entregas/periodo' &&
          request.method !== 'POST')
      ) {
        response.setHeader(
          'Allow',
          pathname === '/api/entregas'
            ? 'GET, POST'
            : pathname === '/api/entregas/periodo'
              ? 'DELETE'
              : 'POST',
        );
        response.statusCode = 405;
        response.end(JSON.stringify({ error: 'Método não permitido.' }));
        return;
      }

      let body = '';
      let tooLarge = false;
      const isFormEncoded = String(request.headers['content-type'] || '').includes(
        'application/x-www-form-urlencoded',
      );
      request.setEncoding('utf8');
      request.on('data', (chunk) => {
        if (tooLarge) return;
        body += chunk;
        if (Buffer.byteLength(body) > 100_000) tooLarge = true;
      });

      request.on('end', () => {
        if (tooLarge) {
          response.statusCode = 413;
          response.end(JSON.stringify({ error: 'Os dados enviados são muito grandes.' }));
          return;
        }

        let values;
        try {
          values = isFormEncoded
            ? Object.fromEntries(new URLSearchParams(body))
            : JSON.parse(body);
        } catch {
          response.statusCode = 400;
          response.end(JSON.stringify({ error: 'Os dados enviados são inválidos.' }));
          return;
        }

        if (pathname === '/api/entregas/periodo') {
          const validDateRange =
            values !== null &&
            typeof values === 'object' &&
            !Array.isArray(values) &&
            isValidDate(values.dataInicio) &&
            isValidDate(values.dataFim) &&
            values.dataInicio <= values.dataFim;

          if (!validDateRange) {
            response.statusCode = 400;
            response.end(
              JSON.stringify({
                error: 'Informe um período válido, com a data inicial anterior ou igual à final.',
              }),
            );
            return;
          }

          try {
            database.exec('BEGIN IMMEDIATE');
            try {
              const deliveries = database
                .prepare('DELETE FROM entregas WHERE data >= ? AND data <= ?')
                .run(values.dataInicio, values.dataFim);
              const dailyGains = database
                .prepare('DELETE FROM ganho_diario WHERE data >= ? AND data <= ?')
                .run(values.dataInicio, values.dataFim);
              database.exec('COMMIT');

              response.statusCode = 200;
              response.end(JSON.stringify({
                message: 'Registros e ganhos calculados do período foram deletados.',
                registrosDeletados: Number(deliveries.changes),
                ganhosDeletados: Number(dailyGains.changes),
              }));
            } catch (error) {
              database.exec('ROLLBACK');
              throw error;
            }
          } catch (error) {
            console.error('Erro ao deletar dados do período:', error);
            response.statusCode = 500;
            response.end(JSON.stringify({ error: 'Erro ao deletar os dados do período.' }));
          }
          return;
        }

        if (
          pathname === '/api/ganho-diario/periodo' ||
          pathname === '/api/ganho-diario/periodo/planilha'
        ) {
          const isSpreadsheetRequest = pathname.endsWith('/planilha');
          const validDateRange =
            values !== null &&
            typeof values === 'object' &&
            !Array.isArray(values) &&
            isValidDate(values.dataInicio) &&
            isValidDate(values.dataFim) &&
            values.dataInicio <= values.dataFim;

          if (!validDateRange) {
            response.statusCode = 400;
            response.end(JSON.stringify({ error: 'Informe um período válido, com a data inicial anterior ou igual à final.' }));
            return;
          }

          try {
            const records = database
              .prepare(
                'SELECT data, quantidade_entregas, saida, nota FROM entregas WHERE data >= ? AND data <= ? ORDER BY data',
              )
              .all(values.dataInicio, values.dataFim);
            const recordsByDate = new Map();

            for (const record of records) {
              const dailyRecords = recordsByDate.get(record.data) || [];
              dailyRecords.push(record);
              recordsByDate.set(record.data, dailyRecords);
            }

            const start = new Date(`${values.dataInicio}T00:00:00.000Z`);
            const end = new Date(`${values.dataFim}T00:00:00.000Z`);
            const days = [];

            for (let day = start; day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
              const data = day.toISOString().slice(0, 10);
              const totals = calculateDailyTotals(recordsByDate.get(data) || [], 'período');
              days.push({
                data,
                quantidade_entregas: totals.quantity,
                ganho_diario: totals.gain,
              });
            }

            database.exec('BEGIN IMMEDIATE');
            try {
              for (const day of days) {
                saveDailyGain.run(day.data, day.quantidade_entregas, day.ganho_diario);
              }
              database.exec('COMMIT');
            } catch (error) {
              database.exec('ROLLBACK');
              throw error;
            }

            response.statusCode = 200;
            if (isSpreadsheetRequest) {
              const workbook = createDailyWorkbook(days);
              response.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              );
              response.setHeader(
                'Content-Disposition',
                `attachment; filename="ganhos-diarios-${values.dataInicio}-a-${values.dataFim}.xlsx"`,
              );
              response.end(Buffer.from(workbook));
            } else {
              response.end(JSON.stringify({
                dataInicio: values.dataInicio,
                dataFim: values.dataFim,
                days,
              }));
            }
          } catch (error) {
            if (error.message === 'Confira a nota dos registros deste período.') {
              response.statusCode = 400;
              response.end(JSON.stringify({ error: error.message }));
              return;
            }

            console.error('Erro ao calcular ganhos do período:', error);
            response.statusCode = 500;
            response.end(JSON.stringify({ error: 'Erro ao calcular os ganhos do período.' }));
          }
          return;
        }

        if (pathname === '/api/ganho-diario/mes') {
          const validMonth =
            values !== null &&
            typeof values === 'object' &&
            !Array.isArray(values) &&
            typeof values.month === 'string' &&
            /^\d{4}-(0[1-9]|1[0-2])$/.test(values.month);

          if (!validMonth) {
            response.statusCode = 400;
            response.end(JSON.stringify({ error: 'Selecione um mês válido.' }));
            return;
          }

          try {
            const [year, month] = values.month.split('-').map(Number);
            const endYear = month === 12 ? year + 1 : year;
            const endMonth = month === 12 ? 1 : month + 1;
            const monthEnd = `${String(endYear).padStart(4, '0')}-${String(endMonth).padStart(2, '0')}-01`;
            const monthLength = [
              31,
              year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28,
              31,
              30,
              31,
              30,
              31,
              31,
              30,
              31,
              30,
              31,
            ][month - 1];
            const records = database
              .prepare(
                'SELECT data, quantidade_entregas, saida, nota FROM entregas WHERE data >= ? AND data < ? ORDER BY data',
              )
              .all(`${values.month}-01`, monthEnd);
            const recordsByDate = new Map();

            for (const record of records) {
              const dailyRecords = recordsByDate.get(record.data) || [];
              dailyRecords.push(record);
              recordsByDate.set(record.data, dailyRecords);
            }

            const days = Array.from({ length: monthLength }, (_, index) => {
              const data = `${values.month}-${String(index + 1).padStart(2, '0')}`;
              const totals = calculateDailyTotals(recordsByDate.get(data) || [], 'mês');
              return {
                data,
                quantidade_entregas: totals.quantity,
                ganho_diario: totals.gain,
              };
            });

            database.exec('BEGIN IMMEDIATE');
            try {
              for (const day of days) {
                saveDailyGain.run(day.data, day.quantidade_entregas, day.ganho_diario);
              }
              database.exec('COMMIT');
            } catch (error) {
              database.exec('ROLLBACK');
              throw error;
            }

            response.statusCode = 200;
            if (isFormEncoded) {
              const rows = [
                ['Data', 'Quantidade de entregas', 'Ganho diário'],
                ...days.map((day) => {
                  const [dayYear, dayMonth, dayNumber] = day.data.split('-');
                  return [
                    `${dayNumber}/${dayMonth}/${dayYear}`,
                    day.quantidade_entregas,
                    day.ganho_diario.toFixed(2).replace('.', ','),
                  ];
                }),
              ];
              const csv = `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(';')).join('\r\n')}`;
              response.setHeader('Content-Type', 'text/csv; charset=utf-8');
              response.setHeader(
                'Content-Disposition',
                `attachment; filename="ganhos-diarios-${values.month}.csv"`,
              );
              response.end(csv);
            } else {
              response.end(JSON.stringify({ month: values.month, days }));
            }
          } catch (error) {
            if (error.message === 'Confira a nota dos registros deste mês.') {
              response.statusCode = 400;
              response.end(JSON.stringify({ error: error.message }));
              return;
            }

            console.error('Erro ao gerar ganhos do mês:', error);
            response.statusCode = 500;
            response.end(JSON.stringify({ error: 'Erro ao gerar a planilha do mês.' }));
          }
          return;
        }

        const validDate =
          values !== null &&
          typeof values === 'object' &&
          !Array.isArray(values) &&
          isValidDate(values.data);

        if (!validDate) {
          response.statusCode = 400;
          response.end(JSON.stringify({ error: 'Informe uma data válida.' }));
          return;
        }

        if (pathname === '/api/ganho-diario') {
          try {
            const dailyRecords = database
              .prepare(
                'SELECT quantidade_entregas, saida, nota FROM entregas WHERE data = ?',
              )
              .all(values.data);
            const summary = calculateDailyTotals(dailyRecords);

            saveDailyGain.run(values.data, summary.quantity, summary.gain);
            response.statusCode = 200;
            response.end(
              JSON.stringify({
                data: values.data,
                quantidade_entregas: summary.quantity,
                ganho_diario: summary.gain,
              }),
            );
          } catch (error) {
            if (error.message === 'Confira a nota dos registros deste dia.') {
              response.statusCode = 400;
              response.end(JSON.stringify({ error: error.message }));
              return;
            }

            console.error('Erro ao calcular ganho diário:', error);
            response.statusCode = 500;
            response.end(JSON.stringify({ error: 'Erro ao salvar o ganho diário no banco.' }));
          }
          return;
        }

        if (!Number.isInteger(values.quantidade) || values.quantidade < 0) {
          response.statusCode = 400;
          response.end(JSON.stringify({ error: 'A quantidade deve ser um inteiro não negativo.' }));
          return;
        }

        if (
          (values.saida !== null &&
            (typeof values.saida !== 'number' || !Number.isFinite(values.saida))) ||
          typeof values.nota !== 'string'
        ) {
          response.statusCode = 400;
          response.end(JSON.stringify({ error: 'Confira os valores de saída e nota.' }));
          return;
        }

        try {
          insertDelivery.run(
            values.data,
            values.quantidade,
            values.saida,
            values.nota,
          );
          response.statusCode = 201;
          response.end(JSON.stringify({ message: 'Dados salvos com sucesso.' }));
        } catch (error) {
          console.error('Erro ao salvar entrega:', error);
          response.statusCode = 500;
          response.end(JSON.stringify({ error: 'Erro ao salvar os dados no banco.' }));
        }
      });
    };

    handler.close = () => database.close();
    return handler;
}