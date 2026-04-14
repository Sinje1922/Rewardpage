import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api, setAuthToken } from '../api/client'

const TOKEN_KEY = 'rp_token'

export type User = { id: string; email: string; role: string }

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<User | null>(null)

  if (token.value) setAuthToken(token.value)

  /** 캠페인·미션 운영 (ADMIN, MANAGER) */
  const isOperator = computed(() => ['MANAGER', 'ADMIN'].includes(user.value?.role ?? ''))
  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  async function loadMe() {
    if (!token.value) return
    const { data } = await api.get<User>('/auth/me')
    user.value = data
  }

  function persist(t: string) {
    token.value = t
    localStorage.setItem(TOKEN_KEY, t)
    setAuthToken(t)
  }

  async function login(email: string, password: string) {
    const { data } = await api.post<{ token: string; user: User }>('/auth/login', { email, password })
    persist(data.token)
    user.value = data.user
  }

  async function register(email: string, password: string) {
    const { data } = await api.post<{ token: string; user: User }>('/auth/register', { email, password })
    persist(data.token)
    user.value = data.user
  }

  async function loginWithGoogle(credential: string) {
    const { data } = await api.post<{ token: string; user: User }>('/auth/google', { credential })
    persist(data.token)
    user.value = data.user
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    setAuthToken(null)
  }

  return { token, user, isOperator, isAdmin, loadMe, login, register, loginWithGoogle, logout }
})
