import { api } from './api'

/** Accounts listed for an owner account, newest last. */
export async function fetchAccounts() {
  const data = await api('/api/owner/accounts')
  return data.accounts || []
}

/** Erases one account, its sign-in sessions and every setting it stored. */
export async function eraseAccount(accountId) {
  return api('/api/owner/erase', { method: 'POST', body: { accountId } })
}
