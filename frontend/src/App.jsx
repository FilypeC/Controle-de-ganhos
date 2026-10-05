import React from 'react';
import { useEffect, useState } from 'react';
import { LoginPage } from './components/LoginPage.jsx';
import { AccountRegistrationPage } from './components/AccountRegistrationPage.jsx';
import { UserListPage } from './components/UserListPage.jsx';
import { DailyReportPage } from './components/DailyReportPage.jsx';
import { EntryPage } from './components/EntryPage.jsx';
import { DeleteDataPage } from './components/DeleteDataPage.jsx';


const navigation = [
  { id: 'entrada', label: 'Entrada', path: '/entrada' },
  { id: 'ganhos-diarios', label: 'Ganhos diários', path: '/ganhos-diarios' },
  { id: 'deletar-dados', label: 'Deletar Dados', path: '/deletar-dados' },
  { id: 'lista-usuarios', label: 'Lista de usuários', path: '/lista-usuarios' },
  { id: 'cadastro', label: 'Cadastro', path: '/cadastro' },
];

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