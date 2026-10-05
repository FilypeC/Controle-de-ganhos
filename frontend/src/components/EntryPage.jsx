import React from 'react';

export function EntryPage({ handleSubmit, isSaving, feedback }) {
  return (
    <section className="entry-area" aria-label="Dados do registro">
      <form className="entry-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="entry-date">Data</label>
          <input id="entry-date" name="data" type="date" required />
        </div>
        <div className="field">
          <label htmlFor="entry-time">Valor de saída</label>
          <input
            id="entry-time"
            name="saida"
            type="text"
            inputMode="decimal"
            pattern="-?([0-9]+([.,][0-9]+)?|[.,][0-9]+)"
          />
        </div>
        <div className="field">
          <label htmlFor="entry-quantity">Quantidade de notas</label>
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
          <label htmlFor="entry-note">Valor por nota</label>
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
  );
}
