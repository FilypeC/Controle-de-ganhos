import React from 'react';

export function UserListPage({
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
