<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
    </form>
  </div>
</template>
