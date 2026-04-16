import { createApp } from 'vue'
import { createPinia } from 'pinia'
import GoogleSignInPlugin from 'vue3-google-signin'
import './style.css'
import App from './App.vue'
import router from './router'
import { createI18n } from 'vue-i18n'
import ko from './locales/ko.json'
import en from './locales/en.json'
import pt from './locales/pt.json'

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('locale') || 'ko',
  fallbackLocale: 'en',
  messages: { ko, en, pt }
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(GoogleSignInPlugin, {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
})
app.mount('#app')
