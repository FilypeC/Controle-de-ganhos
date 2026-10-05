import React from 'react';

export function DeleteDataPage({ handleDelete, isDeleting, deleteFeedback }) {
  return (
    <section className="entry-area" aria-label="Deletar dados por período">
      <form className="entry-form delete-form" onSubmit={handleDelete}>
        <div className="field">
          <label htmlFor="delete-start-date">Data Inicial</label>
          <input id="delete-start-date" name="dataInicio" type="date" required />
        </div>
        <div className="field">
          <label htmlFor="delete-end-date">Data final</label>
          <input id="delete-end-date" name="dataFim" type="date" required />
        </div>
        <div className="form-actions">
          <button type="submit" disabled={isDeleting}>
            {isDeleting ? 'Deletando...' : 'Deletar'}
          </button>
        </div>
        <p
          className={`form-status ${deleteFeedback.type}`}
          role="status"
          aria-live="polite"
        >
          {deleteFeedback.message}
        </p>
      </form>
    </section>
  );
}
