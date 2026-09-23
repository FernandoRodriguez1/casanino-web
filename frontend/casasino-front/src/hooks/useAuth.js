import { useCallback, useState } from 'react'
import { login as loginRequest } from '../services/admin'

const TOKEN_KEY = 'casanino_admin_token'

export function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? null)

  const isAuthed = Boolean(token)

  const login = useCallback(async (nombre, password) => {
    const data = await loginRequest(nombre, password)
    const next = data?.token
    if (!next) throw new Error('El servidor no devolvió un token')
    localStorage.setItem(TOKEN_KEY, next)
    setToken(next)
    return next
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
  }, [])

  return { token, isAuthed, login, logout }
}