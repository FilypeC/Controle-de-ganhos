import React from 'react';

export function AccountRegistrationPage({ handleCreateAccount, isCreatingAccount, feedback }) {
  return (
    <section className="entry-area" aria-label="Cadastro de contas">
      <form className="entry-form account-form" onSubmit={handleCreateAccount}>
        <div className="field">
          <label htmlFor="account-id">ID</label>
          <input
            id="account-id"
            name="id"
            type="text"
            autoComplete="off"
            maxLength="64"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="account-password">Senha</label>
          <input
            id="account-password"
            name="senha"
            type="password"
            autoComplete="new-password"
            minLength="8"
            maxLength="256"
            required
          />
        </div>
        <div className="field account-type-field">
          <label htmlFor="account-type">Tipo de conta</label>
          <select id="account-type" name="tipoConta" defaultValue="USUARIO" required>
            <option value="USUARIO">Usuário</option>
            <option value="ADM">ADM</option>
          </select>
        </div>
        <div className="form-actions">
          <button type="submit" disabled={isCreatingAccount}>
            {isCreatingAccount ? 'Cadastrando...' : 'Cadastrar conta'}
          </button>
        </div>
        <p
          className={`form-status ${feedback.type}`}
          role="status"
          aria-live="polite"
        >
          {feedback.message}
        </p>
      </form>
    </section>
  );
}
