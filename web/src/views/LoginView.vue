<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { GoogleSignInButton, type CredentialResponse } from 'vue3-google-signin'
import { useAuthStore } from '../stores/auth'

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
    const r = route.query.redirect as string | undefined
    await router.replace(r || '/campaigns')
  } catch (e: unknown) {
    err.value = '로그인에 실패했습니다.'
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
    const r = route.query.redirect as string | undefined
    await router.replace(r || '/campaigns')
  } catch (e: unknown) {
    err.value = 'Google 로그인에 실패했습니다.'
  } finally {
    loading.value = false
  }
}

const handleGoogleError = () => {
  err.value = 'Google 로그인 중 오류가 발생했습니다.'
}
</script>

<template>
  <div>
    <h1 class="page-title">로그인</h1>
    <form class="card" style="max-width: 22rem" @submit.prevent="onSubmit">
      <div class="field">
        <label for="em">이메일</label>
        <input id="em" v-model="email" type="email" required autocomplete="username" />
      </div>
      <div class="field">
        <label for="pw">비밀번호</label>
        <input id="pw" v-model="password" type="password" required autocomplete="current-password" />
      </div>
      <p v-if="err" class="err">{{ err }}</p>
      <button class="btn primary" type="submit" :disabled="loading">로그인</button>

      <div class="divider">또는</div>

      <div style="display: flex; justify-content: center">
        <GoogleSignInButton @success="handleGoogleSuccess" @error="handleGoogleError" />
      </div>
    </form>
  </div>
</template>
