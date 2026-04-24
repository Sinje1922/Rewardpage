<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { GoogleSignInButton, type CredentialResponse } from 'vue3-google-signin'
import { useAuthStore } from '../stores/auth'

const { t } = useI18n()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const email = ref('')
const password = ref('')
const err = ref('')
const loading = ref(false)

async function onSubmit() {
  err.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    
    // 1. 로그인 직후 최신 프로필 상태 동기화
    await auth.loadMe()

    // 2. 완성도 체크 후 즉시 리다이렉트 (라우터 가드가 2차 방어)
    if (auth.isProfileIncomplete) {
      router.replace({ name: 'setup' })
    } else {
      const r = route.query.redirect as string | undefined
      router.replace(r || { name: 'home' })
    }
  } catch (e: unknown) {
    err.value = t('auth.loginFail')
  } finally {
    loading.value = false
  }
}

async function handleGoogleSuccess(response: CredentialResponse) {
  if (!response.credential) return
  err.value = ''
  loading.value = true
  try {
    await auth.loginWithGoogle(response.credential)
    
    // 1. 구글 로그인 직후 프로필 정보 강제 동기화
    await auth.loadMe()

    // 2. 완성도 체크 후 즉시 리다이렉트
    if (auth.isProfileIncomplete) {
      router.replace({ name: 'setup' })
    } else {
      const r = route.query.redirect as string | undefined
      router.replace(r || { name: 'home' })
    }
  } catch (e: unknown) {
    err.value = t('auth.googleLoginFail')
  } finally {
    loading.value = false
  }
}

const handleGoogleError = () => {
  err.value = t('auth.googleAuthError')
}
</script>

<template>
  <div>
    <h1 class="page-title">{{ $t('auth.login') }}</h1>
    <form class="card login-form" @submit.prevent="onSubmit">
      <div class="field">
        <label for="em">{{ $t('auth.email') }}</label>
        <input id="em" v-model="email" type="email" required autocomplete="username" />
      </div>
      <div class="field">
        <label for="pw">{{ $t('auth.password') }}</label>
        <input id="pw" v-model="password" type="password" required autocomplete="current-password" />
      </div>
      <p v-if="err" class="err">{{ err }}</p>
      <button class="btn primary" type="submit" :disabled="loading">{{ $t('auth.login') }}</button>

      <div class="divider">{{ $t('auth.or') }}</div>

      <div style="display: flex; justify-content: center">
        <GoogleSignInButton @success="handleGoogleSuccess" @error="handleGoogleError" />
      </div>
    </form>
  </div>
</template>

<style scoped>
.page-title {
  text-align: center;
  margin-bottom: 2.5rem;
}

.login-form {
  max-width: 420px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.err {
  color: #ef4444;
  font-size: 0.85rem;
  text-align: center;
  font-weight: 600;
}

@media (max-width: 500px) {
  .login-form {
    max-width: 100%;
    padding: 1.5rem;
  }
}
</style>
