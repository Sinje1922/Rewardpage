import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || ''

export const api = axios.create({
  baseURL: baseURL.endsWith('/') ? baseURL + 'api' : (baseURL ? baseURL + '/api' : '/api'),
})

export function getFileUrl(url: string | null | undefined) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  // baseURL에서 /api 부분을 제외한 순수 도메인/포트 주소 추출
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