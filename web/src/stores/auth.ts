import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api, setAuthToken } from '../api/client'

const TOKEN_KEY = 'rp_token'

export type User = { 
  id: string; 
  email: string; 
  role: string; 
  pointBalance: number; 
  nickname?: string; 
  avatarUrl?: string;
  birthDate?: string;
  birthYear?: number;
  gender?: string;
  region?: string;
  country?: string;
  walletAddress?: string;
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<User | null>(null)

  if (token.value) setAuthToken(token.value)

  /** 캠페인·미션 운영 (ADMIN, MANAGER) */
  const isOperator = computed(() => ['MANAGER', 'ADMIN'].includes(user.value?.role ?? ''))
  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  /** 프로필 필수 항목 누락 여부 확인 (글로벌 표준 버전) */
  const isProfileIncomplete = computed(() => {
    if (!user.value) return false
    const u = user.value
    
    // 유효한 문자열인지 체크 (null, undefined, "null" 등 방어)
    const isValidStr = (val: any) => {
      if (!val) return false
      const s = String(val).trim()
      return s !== '' && s !== 'null' && s !== 'undefined'
    }

    const hasNickname = isValidStr(u.nickname)
    const hasBirth = !!u.birthDate || (!!u.birthYear && u.birthYear > 1900)
    const hasGender = isValidStr(u.gender)
    const hasCountry = isValidStr(u.country)
    const hasWallet = isValidStr(u.walletAddress)

    return !hasNickname || !hasBirth || !hasGender || !hasCountry || !hasWallet
  })

  async function loadMe() {
    if (!token.value) return
    const { data } = await api.get<User>('/me') // Changed from /auth/me to /me for consistency with routes
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

  return { token, user, isOperator, isAdmin, isProfileIncomplete, loadMe, login, register, loginWithGoogle, logout }
})
