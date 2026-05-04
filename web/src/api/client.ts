import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || ''

export const API_BASE = baseURL.endsWith('/') ? baseURL + 'api' : (baseURL ? baseURL + '/api' : '/api')
export const api = axios.create({
  baseURL: API_BASE,
})

export function getFileUrl(url: string | null | undefined) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const root = baseURL || window.location.origin
  return `${root}${url.startsWith('/') ? '' : '/'}${url}`
}

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common.Authorization
  }
}

// [Force Protocol] 모든 요청 직전에 로컬 스토리지에서 토큰을 가져와 헤더를 실시간 동기화합니다.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rp_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, (error) => {
  return Promise.reject(error)
})
