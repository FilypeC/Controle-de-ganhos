import React from 'react';
import { useEffect, useState } from 'react';

const navigation = [
  { id: 'entrada', label: 'Entrada' },
  { id: 'ganhos-diarios', label: 'Ganhos diários' },
];

const numberFormat = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');
}

function formatMonth(value) {
  return new Date(`${value}-01T12:00:00`).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
}

function getCurrentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function App() {
  const [activePage, setActivePage] = useState('entrada');
  const [records, setRecords] = useState([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState('');
  const [searchedDailyDate, setSearchedDailyDate] = useState('');
  const [dailySummary, setDailySummary] = useState(null);
  const [isSearchingDaily, setIsSearchingDaily] = useState(false);
  const [dailySearchError, setDailySearchError] = useState('');
  const [tableGenerationFeedback, setTableGenerationFeedback] = useState({
    type: '',
    message: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    if (activePage === 'entrada') return undefined;

    let isCurrent = true;
    setIsLoadingRecords(true);
    setRecordsError('');

    fetch('/api/entregas')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Não foi possível carregar os dados.');
        return result;
      })
      .then((result) => {
        if (isCurrent) setRecords(result);
      })
      .catch((error) => {
        if (isCurrent) setRecordsError(error.message);
      })
      .finally(() => {
        if (isCurrent) setIsLoadingRecords(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [activePage]);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const saidaText = String(values.get('saida') || '').trim();
    const notaText = String(values.get('nota') || '').trim();
    const validSaidaFormat = /^-?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(saidaText);
    const validNotaFormat = /^-?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(notaText);

    if (saidaText && !validSaidaFormat) {
      setFeedback({ type: 'error', message: 'Informe uma saída numérica válida.' });
      return;
    }

    if (!validNotaFormat) {
      setFeedback({ type: 'error', message: 'Informe uma nota numérica válida.' });
      return;
    }

    const saida = saidaText ? Number(saidaText.replace(',', '.')) : null;

    setIsSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      const response = await fetch('/api/entregas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: values.get('data'),
          quantidade: Number(values.get('quantidade')),
          saida,
          nota: values.get('nota'),
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Não foi possível salvar os dados.');
      }

      form.reset();
      setFeedback({ type: 'success', message: 'Dados salvos com sucesso.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDailySearch(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget).get('data');
    setSearchedDailyDate(data);
    setDailySummary(null);
    setDailySearchError('');
    setIsSearchingDaily(true);

    try {
      const response = await fetch('/api/ganho-diario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Não foi possível pesquisar o ganho diário.');
      }

      setDailySummary(result);
    } catch (error) {
      setDailySearchError(error.message);
    } finally {
      setIsSearchingDaily(false);
    }
  }

  function handleGenerateTable(event) {
    const month = new FormData(event.currentTarget).get('month');
    setTableGenerationFeedback({
      type: '',
      message: `Solicitação enviada para gerar a planilha de ${formatMonth(month)}.`,
    });
  }

  const activeLabel = navigation.find((item) => item.id === activePage)?.label;
  const isDailyReport = activePage === 'ganhos-diarios';
  const reportRows = records.reduce((groups, record) => {
    const period = isDailyReport ? record.data : record.data.slice(0, 7);
    const group = groups[period] || { period, quantity: 0, earnings: 0 };
    group.quantity += record.quantidade_entregas;
    group.earnings += Number(record.saida) || 0;
    groups[period] = group;
    return groups;
  }, {});
  const sortedReportRows = Object.values(reportRows).sort((first, second) =>
    second.period.localeCompare(first.period),
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden="true">TG</span>
          <span>Tabela de Ganhos</span>
        </div>
        <nav className="sidebar-nav" aria-label="Menu principal">
          {navigation.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-link${activePage === item.id ? ' active' : ''}`}
              aria-current={activePage === item.id ? 'page' : undefined}
              onClick={() => setActivePage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="page">
        <h1 className="page-title">
          {activePage === 'entrada' ? 'Tabela de Ganhos' : activeLabel}
        </h1>

        {activePage === 'entrada' ? (
          <section className="entry-area" aria-label="Dados do registro">
            <form className="entry-form" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="entry-date">Data</label>
                <input id="entry-date" name="data" type="date" required />
              </div>
              <div className="field">
                <label htmlFor="entry-time">Saída</label>
                <input
                  id="entry-time"
                  name="saida"
                  type="text"
                  inputMode="decimal"
                  pattern="-?([0-9]+([.,][0-9]+)?|[.,][0-9]+)"
                />
              </div>
              <div className="field">
                <label htmlFor="entry-quantity">Quantidade</label>
                <input
                  id="entry-quantity"
                  name="quantidade"
                  type="number"
                  min="0"
                  step="1"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="entry-note">Nota</label>
                <input
                  id="entry-note"
                  name="nota"
                  type="text"
                  inputMode="decimal"
                  pattern="-?([0-9]+([.,][0-9]+)?|[.,][0-9]+)"
                  required
                />
              </div>
              <div className="form-actions">
                <button type="submit" disabled={isSaving}>
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
              <p className={`form-status ${feedback.type}`} role="status" aria-live="polite">
                {feedback.message}
              </p>
            </form>
          </section>
        ) : (
          <section className="report-area" aria-label={activeLabel}>
            {isDailyReport && (
              <div className="daily-tools">
                <form className="daily-search" onSubmit={handleDailySearch}>
                  <div className="field">
                    <label htmlFor="daily-search-date">Data</label>
                    <input
                      id="daily-search-date"
                      name="data"
                      type="date"
                      required
                    />
                  </div>
                  <button type="submit" disabled={isSearchingDaily}>
                    {isSearchingDaily ? 'Pesquisando...' : 'Pesquisar'}
                  </button>
                </form>
                <form
                  className="spreadsheet-form"
                  action="/api/ganho-diario/mes"
                  method="post"
                  onSubmit={handleGenerateTable}
                >
                  <div className="field">
                    <label htmlFor="spreadsheet-month">Mês</label>
                    <input
                      id="spreadsheet-month"
                      name="month"
                      type="month"
                      defaultValue={getCurrentMonth()}
                      required
                    />
                  </div>
                  <button type="submit">Gerar tabela</button>
                  <p
                    className={`spreadsheet-feedback ${tableGenerationFeedback.type}`}
                    role="status"
                    aria-live="polite"
                  >
                    {tableGenerationFeedback.message}
                  </p>
                </form>
              </div>
            )}

            {isLoadingRecords ? (
              <p className="report-message">Carregando dados...</p>
            ) : recordsError ? (
              <p className="report-message error">{recordsError}</p>
            ) : isDailyReport && isSearchingDaily ? (
              <p className="report-message">Calculando ganho diário...</p>
            ) : isDailyReport && dailySearchError ? (
              <p className="report-message error">{dailySearchError}</p>
            ) : isDailyReport && !searchedDailyDate ? (
              <p className="report-message">Selecione uma data para pesquisar.</p>
            ) : isDailyReport && !dailySummary ? (
              <p className="report-message">Pesquise uma data para ver o ganho diário.</p>
            ) : isDailyReport ? (
              <div className="report-table-wrap">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th scope="col">Data</th>
                      <th scope="col">Quantidade de entregas</th>
                      <th scope="col">Ganho diário</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{formatDate(dailySummary.data)}</td>
                      <td>{dailySummary.quantidade_entregas}</td>
                      <td>{numberFormat.format(dailySummary.ganho_diario)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : sortedReportRows.length === 0 ? (
              <p className="report-message">Nenhum registro salvo ainda.</p>
            ) : (
              <div className="report-table-wrap">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th scope="col">{isDailyReport ? 'Data' : 'Mês'}</th>
                      <th scope="col">Quantidade de entregas</th>
                      <th scope="col">Ganhos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedReportRows.map((row) => (
                      <tr key={row.period}>
                        <td>{isDailyReport ? formatDate(row.period) : formatMonth(row.period)}</td>
                        <td>{row.quantity}</td>
                        <td>{numberFormat.format(row.earnings)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}