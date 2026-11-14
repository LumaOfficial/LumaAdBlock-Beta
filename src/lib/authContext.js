import { createContext } from 'react'

/**
 * Context for the signed-in account. Kept out of auth.jsx so that provider
 * exports only its component and stays a Fast Refresh boundary.
 */
export const AuthContext = createContext(null)
