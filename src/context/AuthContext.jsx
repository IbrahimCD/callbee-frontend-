import React, { createContext, useContext, useState } from 'react'
import api from '../api/client.js'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)

  const login = async (email, password) => {
    setLoading(true)
    try {
      const res = await api.post('/api/auth/login', { email, password })
      localStorage.setItem('token', res.data.token)
      setToken(res.data.token)
      setUser({ email })
    } finally { setLoading(false) }
  }

  const register = async (email, password) => {
    setLoading(true)
    try {
      const res = await api.post('/api/auth/register', { email, password })
      localStorage.setItem('token', res.data.token)
      setToken(res.data.token)
      setUser({ email })
    } finally { setLoading(false) }
  }

  const logout = () => { localStorage.removeItem('token'); setToken(null); setUser(null) }

  return <AuthContext.Provider value={{ token, user, setUser, login, register, logout, loading }}>
    {children}
  </AuthContext.Provider>
}
