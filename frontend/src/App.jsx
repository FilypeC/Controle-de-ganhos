import React from 'react';
import { useEffect, useState } from 'react';

const navigation = [
  { id: 'entrada', label: 'Entrada', path: '/entrada' },
  { id: 'ganhos-diarios', label: 'Ganhos diários', path: '/ganhos-diarios' },
  { id: 'deletar-dados', label: 'Deletar Dados', path: '/deletar-dados' },
  { id: 'lista-usuarios', label: 'Lista de usuários', path: '/lista-usuarios' },
  { id: 'cadastro', label: 'Cadastro', path: '/cadastro' },
];

const numberFormat = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function LoginPage({ handleLogin, handleRegistrationRequest, isLoggingIn, feedback }) {
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

function AccountRegistrationPage({ handleCreateAccount, isCreatingAccount, feedback }) {
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

function UserListPage({
  accounts,
  currentAccount,
  deletingAccountId,
  isLoading,
  error,
  handleDeleteAccount,
}) {
  return (
    <section className="report-area user-list-area" aria-label="Lista de usuários">
      <p className="report-message">
        Por segurança, senhas não são exibidas. Elas ficam armazenadas como hashes.
      </p>
      {error && <p className="report-message error" role="alert">{error}</p>}
      {isLoading ? (
        <p className="report-message">Carregando usuários...</p>
      ) : accounts.length === 0 ? (
        <p className="report-message">Nenhuma conta cadastrada.</p>
      ) : (
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Tipo de conta</th>
                <th scope="col">Ação</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td>{account.id}</td>
                  <td>{account.tipoConta}</td>
                  <td>
                    {account.id === currentAccount?.id ? (
                      <span className="current-account-label">Conta atual</span>
                    ) : (
                      <button
                        className="user-delete-button"
                        type="button"
                        onClick={() => handleDeleteAccount(account.id)}
                        disabled={deletingAccountId !== ''}
                      >
                        {deletingAccountId === account.id ? 'Deletando...' : 'Deletar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function formatDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');
}

function DailyReportPage({
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

function EntryPage({ handleSubmit, isSaving, feedback }) {
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

function DeleteDataPage({ handleDelete, isDeleting, deleteFeedback }) {
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

export default function App() {
  const [isLoginRoute, setIsLoginRoute] = useState(
    () => window.location.pathname === '/' || window.location.pathname === '/login',
  );
  const [activePage, setActivePage] = useState(
    () => navigation.find((item) => item.path === window.location.pathname)?.id ?? 'entrada',
  );
  const [currentAccount, setCurrentAccount] = useState(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginFeedback, setLoginFeedback] = useState('');
  const [isRegistrationRequested, setIsRegistrationRequested] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [accountFeedback, setAccountFeedback] = useState({ type: '', message: '' });
  const [accounts, setAccounts] = useState([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [accountsError, setAccountsError] = useState('');
  const [deletingAccountId, setDeletingAccountId] = useState('');
  const [authorizationMessage, setAuthorizationMessage] = useState('');
  const [searchedDateRange, setSearchedDateRange] = useState(null);
  const [dailySummaries, setDailySummaries] = useState([]);
  const [isSearchingDaily, setIsSearchingDaily] = useState(false);
  const [dailySearchError, setDailySearchError] = useState('');
  const [isExportingDaily, setIsExportingDaily] = useState(false);
  const [dailyExportError, setDailyExportError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState({ type: '', message: '' });

  async function handleLogin(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setIsLoggingIn(true);
    setLoginFeedback('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: values.get('id'), senha: values.get('senha') }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível entrar.');

      setCurrentAccount({ id: result.id, tipoConta: result.tipoConta });
      setLoginFeedback('');
      const isAdmin = result.tipoConta === 'ADM';
      setAuthorizationMessage(
        isRegistrationRequested && result.tipoConta !== 'ADM'
          ? 'A página de cadastro é exclusiva para contas ADM.'
          : '',
      );
      setIsRegistrationRequested(false);
      const destination = navigation.find(
        (item) => item.id === (isAdmin ? 'lista-usuarios' : 'entrada'),
      );
      window.history.pushState({}, '', destination.path);
      setIsLoginRoute(false);
      setActivePage(destination.id);
    } catch (error) {
      setLoginFeedback(error.message);
    } finally {
      setIsLoggingIn(false);
    }
  }

  function handleRegistrationRequest() {
    setIsRegistrationRequested(true);
    setLoginFeedback('');
    setAuthorizationMessage('Entre com sua conta ADM para abrir a página de cadastro.');
  }

  async function handleCreateAccount(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setIsCreatingAccount(true);
    setAccountFeedback({ type: '', message: '' });

    try {
      const response = await fetch('/api/contas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: values.get('id'),
          senha: values.get('senha'),
          tipoConta: values.get('tipoConta'),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível cadastrar a conta.');

      form.reset();
      setAccountFeedback({ type: 'success', message: `Conta "${result.id}" cadastrada com sucesso.` });
    } catch (error) {
      setAccountFeedback({ type: 'error', message: error.message });
    } finally {
      setIsCreatingAccount(false);
    }
  }

  async function handleDeleteAccount(id) {
    if (id === currentAccount?.id) {
      setAccountsError('Não é possível deletar a conta ADM em uso.');
      return;
    }

    if (!window.confirm(`Deseja realmente deletar a conta "${id}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setDeletingAccountId(id);
    setAccountsError('');

    try {
      const response = await fetch('/api/contas', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível deletar a conta.');

      setAccounts((currentAccounts) => currentAccounts.filter((account) => account.id !== id));
    } catch (error) {
      setAccountsError(error.message);
    } finally {
      setDeletingAccountId('');
    }
  }

  useEffect(() => {
    if (activePage !== 'lista-usuarios' || currentAccount?.tipoConta !== 'ADM') return;

    let isCurrent = true;
    setIsLoadingAccounts(true);
    setAccountsError('');

    fetch('/api/contas')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Não foi possível carregar a lista de usuários.');
        }
        return result;
      })
      .then((result) => {
        if (isCurrent) setAccounts(result);
      })
      .catch((error) => {
        if (isCurrent) setAccountsError(error.message);
      })
      .finally(() => {
        if (isCurrent) setIsLoadingAccounts(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [activePage, currentAccount]);

  async function handleLogout() {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Não foi possível encerrar a sessão.');
      }
      setCurrentAccount(null);
      window.history.pushState({}, '', '/');
      setIsLoginRoute(true);
    } catch (error) {
      setAuthorizationMessage(error.message);
    }
  }

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
    const values = new FormData(event.currentTarget);
    const dataInicio = values.get('dataInicio');
    const dataFim = values.get('dataFim');
    setSearchedDateRange({ dataInicio, dataFim });
    setDailySummaries([]);
    setDailySearchError('');
    setDailyExportError('');
    setIsSearchingDaily(true);

    try {
      const response = await fetch('/api/ganho-diario/periodo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataInicio, dataFim }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Não foi possível pesquisar os ganhos diários.');
      }

      setDailySummaries(result.days);
    } catch (error) {
      setDailySearchError(error.message);
    } finally {
      setIsSearchingDaily(false);
    }
  }

  async function handleDelete(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const dataInicio = values.get('dataInicio');
    const dataFim = values.get('dataFim');

    if (dataInicio > dataFim) {
      setDeleteFeedback({
        type: 'error',
        message: 'A data inicial deve ser anterior ou igual à data final.',
      });
      return;
    }

    const formatConfirmationDate = (value) =>
      new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');
    const confirmed = window.confirm(
      `Esta ação apagará os registros e ganhos calculados de ${formatConfirmationDate(dataInicio)} até ${formatConfirmationDate(dataFim)}. Deseja continuar?`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setDeleteFeedback({ type: '', message: '' });

    try {
      const response = await fetch('/api/entregas/periodo', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataInicio, dataFim }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Não foi possível deletar os dados.');
      }

      setDeleteFeedback({
        type: 'success',
        message: 'Registros e ganhos calculados do período foram deletados.',
      });
      form.reset();
      setSearchedDateRange(null);
      setDailySummaries([]);
      setDailySearchError('');
      setDailyExportError('');
    } catch (error) {
      setDeleteFeedback({ type: 'error', message: error.message });
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSpreadsheetDownload() {
    if (!searchedDateRange || isExportingDaily) return;

    setIsExportingDaily(true);
    setDailyExportError('');

    try {
      const response = await fetch('/api/ganho-diario/periodo/planilha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchedDateRange),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Não foi possível gerar a planilha.');
      }

      const workbook = await response.blob();
      const downloadUrl = URL.createObjectURL(workbook);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `ganhos-diarios-${searchedDateRange.dataInicio}-a-${searchedDateRange.dataFim}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
    } catch (error) {
      setDailyExportError(error.message);
    } finally {
      setIsExportingDaily(false);
    }
  }

  const activeLabel = navigation.find((item) => item.id === activePage)?.label;

  useEffect(() => {
    let isCurrent = true;

    fetch('/api/sessao')
      .then(async (response) => {
        if (response.status === 401) return null;
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Não foi possível verificar a sessão.');
        return { id: result.id, tipoConta: result.tipoConta };
      })
      .then((account) => {
        if (isCurrent) setCurrentAccount(account);
      })
      .catch((error) => {
        if (isCurrent) setLoginFeedback(error.message);
      })
      .finally(() => {
        if (isCurrent) setIsSessionLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    const syncPageWithRoute = () => {
      if (window.location.pathname === '/' || window.location.pathname === '/login') {
        setIsLoginRoute(true);
        return;
      }

      const page = navigation.find((item) => item.path === window.location.pathname);

      if (page) {
        if (
          page.id === 'cadastro' ||
          page.id === 'lista-usuarios' ||
          page.id === 'deletar-dados'
        ) {
          if (isSessionLoading) return;
          if (!currentAccount) {
            window.history.replaceState({}, '', '/');
            setIsLoginRoute(true);
            setAuthorizationMessage('Entre na sua conta para acessar esta página.');
            return;
          }
          if (currentAccount.tipoConta !== 'ADM') {
            window.history.replaceState({}, '', navigation[0].path);
            setIsLoginRoute(false);
            setActivePage(navigation[0].id);
            setAuthorizationMessage('Esta página é exclusiva para contas ADM.');
            return;
          }
        }

        setIsLoginRoute(false);
        setActivePage(page.id);
        return;
      }

      window.history.replaceState({}, '', navigation[0].path);
      setIsLoginRoute(false);
      setActivePage(navigation[0].id);
    };

    syncPageWithRoute();
    window.addEventListener('popstate', syncPageWithRoute);
    return () => window.removeEventListener('popstate', syncPageWithRoute);
  }, [currentAccount, isSessionLoading]);

  useEffect(() => {
    document.title = isLoginRoute ? 'Entrar | Tabela de Ganhos' : activeLabel;
  }, [activeLabel, isLoginRoute]);

  if (isLoginRoute) {
    return (
      <LoginPage
        handleLogin={handleLogin}
        handleRegistrationRequest={handleRegistrationRequest}
        isLoggingIn={isLoggingIn}
        feedback={authorizationMessage || loginFeedback}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden="true">TG</span>
          <span>Tabela de Ganhos</span>
        </div>
        <nav className="sidebar-nav" aria-label="Menu principal">
          {navigation
            .filter(
              (item) =>
                  !['cadastro', 'lista-usuarios', 'deletar-dados'].includes(item.id) ||
                currentAccount?.tipoConta === 'ADM',
            )
            .map((item) => (
            <a
              key={item.id}
              href={item.path}
              className={`nav-link${activePage === item.id ? ' active' : ''}`}
              aria-current={activePage === item.id ? 'page' : undefined}
              onClick={(event) => {
                if (
                  event.button !== 0 ||
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                ) {
                  return;
                }

                event.preventDefault();
                if (window.location.pathname !== item.path) {
                  window.history.pushState({}, '', item.path);
                }
                setIsLoginRoute(false);
                setActivePage(item.id);
                setAuthorizationMessage('');
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <button className="logout-button" type="button" onClick={handleLogout}>
          Sair
        </button>
      </aside>

      <main className="page">
        <h1 className="page-title">{activeLabel}</h1>

        {authorizationMessage && (
          <p className="report-message error" role="alert">{authorizationMessage}</p>
        )}

        {(
          activePage === 'cadastro' ||
          activePage === 'lista-usuarios' ||
          activePage === 'deletar-dados'
        ) && isSessionLoading ? (
          <p className="report-message">Verificando acesso...</p>
        ) : activePage === 'lista-usuarios' ? (
          <UserListPage
            accounts={accounts}
            currentAccount={currentAccount}
            deletingAccountId={deletingAccountId}
            isLoading={isLoadingAccounts}
            error={accountsError}
            handleDeleteAccount={handleDeleteAccount}
          />
        ) : activePage === 'cadastro' ? (
          <AccountRegistrationPage
            handleCreateAccount={handleCreateAccount}
            isCreatingAccount={isCreatingAccount}
            feedback={accountFeedback}
          />
        ) : activePage === 'entrada' ? (
          <EntryPage handleSubmit={handleSubmit} isSaving={isSaving} feedback={feedback} />
        ) : activePage === 'ganhos-diarios' ? (
          <DailyReportPage
            searchedDateRange={searchedDateRange}
            dailySummaries={dailySummaries}
            isSearchingDaily={isSearchingDaily}
            dailySearchError={dailySearchError}
            handleDailySearch={handleDailySearch}
            isExportingDaily={isExportingDaily}
            dailyExportError={dailyExportError}
            handleSpreadsheetDownload={handleSpreadsheetDownload}
          />
        ) : (
          <DeleteDataPage
            handleDelete={handleDelete}
            isDeleting={isDeleting}
            deleteFeedback={deleteFeedback}
          />
        )}
      </main>
    </div>
  );
}