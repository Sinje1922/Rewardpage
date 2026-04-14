import { api } from './client'

export async function uploadCompanyLogo(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<{ url: string }>('/upload/logo', form)
  return data.url
}
