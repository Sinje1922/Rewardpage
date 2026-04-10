<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const email = ref('')
const password = ref('')
const err = ref('')
const loading = ref(false)

async function onSubmit() {
  err.value = ''
  loading.value = true
  try {
    await auth.register(email.value, password.value)
    await router.replace('/campaigns')
  } catch {
    err.value = '가입에 실패했습니다. 이미 있는 이메일일 수 있습니다.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="page-title">회원가입</h1>
    <form class="card" style="max-width: 22rem" @submit.prevent="onSubmit">
      <div class="field">
        <label for="em">이메일</label>
        <input id="em" v-model="email" type="email" required autocomplete="username" />
      </div>
      <div class="field">
        <label for="pw">비밀번호 (6자 이상)</label>
        <input id="pw" v-model="password" type="password" required minlength="6" autocomplete="new-password" />
      </div>
      <p v-if="err" class="err">{{ err }}</p>
      <button class="btn primary" type="submit" :disabled="loading">가입</button>
    </form>
  </div>
</template>
