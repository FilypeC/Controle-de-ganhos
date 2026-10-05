import React from 'react';
import { formatDate, numberFormat } from '../lib/formatters.js';

export function DailyReportPage({
  searchedDateRange,
  dailySummaries,
  isSearchingDaily,
  dailySearchError,
  handleDailySearch,
  isExportingDaily,
  dailyExportError,
  handleSpreadsheetDownload,
}) {
  return (
    <section className="report-area" aria-label="Ganhos diários">
      <div className="daily-tools">
        <form className="daily-search" onSubmit={handleDailySearch}>
          <div className="field">
            <label htmlFor="daily-search-start">Data inicial</label>
            <input id="daily-search-start" name="dataInicio" type="date" required />
          </div>
          <div className="field">
            <label htmlFor="daily-search-end">Data final</label>
            <input id="daily-search-end" name="dataFim" type="date" required />
          </div>
          <div className="daily-search-actions">
            <button type="submit" disabled={isSearchingDaily || isExportingDaily}>
              {isSearchingDaily ? 'Pesquisando...' : 'Pesquisar'}
            </button>
            <button
              type="button"
              onClick={handleSpreadsheetDownload}
              disabled={
                !searchedDateRange ||
                dailySearchError !== '' ||
                isSearchingDaily ||
                isExportingDaily
              }
            >
              {isExportingDaily ? 'Gerando planilha...' : 'Gerar planilha'}
            </button>
          </div>
        </form>
      </div>

      {isSearchingDaily ? (
        <p className="report-message">Calculando ganhos diários...</p>
      ) : dailySearchError ? (
        <p className="report-message error">{dailySearchError}</p>
      ) : !searchedDateRange ? (
        <p className="report-message">Selecione o período para pesquisar.</p>
      ) : dailySummaries.length === 0 ? (
        <p className="report-message">Nenhum registro encontrado no período.</p>
      ) : (
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Quantidade de notas</th>
                <th scope="col">Ganho diário</th>
              </tr>
            </thead>
            <tbody>
              {dailySummaries.map((summary) => (
                <tr key={summary.data}>
                  <td>{formatDate(summary.data)}</td>
                  <td>{summary.quantidade_entregas}</td>
                  <td>{numberFormat.format(summary.ganho_diario)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dailyExportError && (
        <p className="report-message error" role="alert">{dailyExportError}</p>
      )}
    </section>
  );
}
