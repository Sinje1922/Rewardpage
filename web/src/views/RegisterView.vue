<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'

const { t } = useI18n()
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
    err.value = t('auth.registerFail')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="page-title">{{ $t('auth.register') }}</h1>
    <form class="card" style="max-width: 22rem" @submit.prevent="onSubmit">
      <div class="field">
        <label for="em">{{ $t('auth.email') }}</label>
        <input id="em" v-model="email" type="email" required autocomplete="username" />
      </div>
      <div class="field">
        <label for="pw">{{ $t('auth.passwordHint') }}</label>
        <input id="pw" v-model="password" type="password" required minlength="6" autocomplete="new-password" />
      </div>
      <p v-if="err" class="err">{{ err }}</p>
      <button class="btn primary" type="submit" :disabled="loading">{{ $t('auth.registerBtn') }}</button>
    </form>
  </div>
</template>
