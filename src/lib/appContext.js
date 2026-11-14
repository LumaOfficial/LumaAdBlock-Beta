import { createContext } from 'react'

/**
 * Context for the protection settings. It lives in its own module (instead of
 * store.jsx) so the provider file exports only a component and stays a Fast
 * Refresh boundary — otherwise every edit full-reloads the open page.
 */
export const AppContext = createContext(null)
