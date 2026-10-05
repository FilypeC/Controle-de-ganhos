import React from 'react';

export function LoginPage({ handleLogin, handleRegistrationRequest, isLoggingIn, feedback }) {
  return (
    <main className="login-page">
      <section className="login-intro" aria-label="Tabela de Ganhos">
        <a className="login-brand" href="/" aria-label="Tabela de Ganhos, página inicial">
          <span className="login-brand-mark" aria-hidden="true">TG</span>
          <span>Tabela de Ganhos</span>
        </a>
        <div className="login-intro-copy">
          <span className="login-eyebrow">CONTROLE SIMPLES, DIA A DIA</span>
          <h1>Seus ganhos,<br />sob controle.</h1>
          <p>Acompanhe suas entregas e tenha seus resultados sempre à mão.</p>
        </div>
        <span className="login-intro-footer">Organização que acompanha o seu ritmo.</span>
      </section>

      <section className="login-content" aria-labelledby="login-title">
        <div className="login-card">
          <div className="login-card-heading">
            <span className="login-eyebrow">BEM-VINDO DE VOLTA</span>
            <h2 id="login-title">Acesse sua conta</h2>
            <p>Entre com seus dados para continuar.</p>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <div className="field">
              <label htmlFor="login-id">ID</label>
              <input
                id="login-id"
                name="id"
                type="text"
                autoComplete="username"
                placeholder="Digite seu ID"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="login-password">Senha</label>
              <input
                id="login-password"
                name="senha"
                type="password"
                autoComplete="current-password"
                placeholder="Digite sua senha"
                required
              />
            </div>
            <button className="login-submit" type="submit" disabled={isLoggingIn}>
              {isLoggingIn ? 'Entrando...' : 'Entrar'}
            </button>
            <p className="login-feedback" role="status" aria-live="polite">{feedback}</p>
          </form>
          <button
            className="login-register-button"
            type="button"
            onClick={handleRegistrationRequest}
          >
            Cadastro
          </button>
          <p className="login-register-hint">Acesso exclusivo para contas ADM.</p>
          <p className="login-card-footer">Seus dados, com cuidado e simplicidade.</p>
        </div>
        <span className="login-copyright">Tabela de Ganhos</span>
      </section>
    </main>
  );
}
