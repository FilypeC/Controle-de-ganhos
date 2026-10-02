import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

function escapeCsvCell(value) {
  const text = String(value);
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function calculateDailyTotals(records, period = 'dia') {
  return records.reduce(
    (totals, record) => {
      const quantity = Number(record.quantidade_entregas);
      const note = Number(String(record.nota).replace(',', '.'));
      const output = Number(record.saida) || 0;

      if (!Number.isFinite(note)) {
        throw new Error(`Confira a nota dos registros deste ${period}.`);
      }

      totals.quantity += quantity;
      totals.gain += (quantity - 50) * note + output;
      return totals;
    },
    { quantity: 0, gain: 0 },
  );
}

function databaseApi() {
  function registerApi(server) {
    const database = new DatabaseSync(resolve(process.cwd(), 'entregas.db'));
    database.exec(`
      CREATE TABLE IF NOT EXISTS entregas (
        data DATE NOT NULL,
        quantidade_entregas INTEGER NOT NULL CHECK (quantidade_entregas >= 0),
        saida TIME,
        nota TEXT
      );
      CREATE TABLE IF NOT EXISTS ganho_diario (
        data DATE PRIMARY KEY,
        quantidade_entregas INTEGER NOT NULL,
        ganho_diario REAL NOT NULL
      )
    `);
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

    server.middlewares.use((request, response, next) => {
      const pathname = new URL(request.url || '/', 'http://localhost').pathname;

      if (
        pathname !== '/api/entregas' &&
        pathname !== '/api/ganho-diario' &&
        pathname !== '/api/ganho-diario/mes'
      ) {
        next();
        return;
      }

      response.setHeader('Content-Type', 'application/json; charset=utf-8');

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

      if (request.method !== 'POST') {
        response.setHeader('Allow', pathname === '/api/entregas' ? 'GET, POST' : 'POST');
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
          typeof values.data === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(values.data) &&
          Number.isFinite(Date.parse(`${values.data}T00:00:00.000Z`)) &&
          new Date(`${values.data}T00:00:00.000Z`).toISOString().slice(0, 10) === values.data;

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
    });
  }

  return {
    name: 'entregas-database-api',
    configureServer: registerApi,
    configurePreviewServer: registerApi,
  };
}

export default defineConfig({
  plugins: [databaseApi()],
});