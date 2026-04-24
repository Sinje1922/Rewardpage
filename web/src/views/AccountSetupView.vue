<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { api } from '../api/client'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()

const nickname = ref('')
const walletAddress = ref('')
const birthDate = ref('')
const gender = ref('')
const country = ref('')

const saving = ref(false)
const error = ref('')

const countries = [
  { code: 'KR', name: 'South Korea' },
  { code: 'US', name: 'United States' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'PH', name: 'Philippines' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'CA', name: 'Canada' },
  { code: 'IN', name: 'India' },
  { code: 'AU', name: 'Australia' },
  { code: 'RU', name: 'Russia' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'SG', name: 'Singapore' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'TR', name: 'Turkey' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'IL', name: 'Israel' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'IE', name: 'Ireland' },
  { code: 'BE', name: 'Belgium' },
  { code: 'AT', name: 'Austria' },
  { code: 'PL', name: 'Poland' },
  { code: 'NZ', name: 'New Zealand' }
].sort((a, b) => a.name.localeCompare(b.name))

onMounted(() => {
  if (auth.user) {
    nickname.value = auth.user.nickname || ''
    walletAddress.value = auth.user.walletAddress || ''
    gender.value = auth.user.gender || ''
    country.value = auth.user.country || ''
    if (auth.user.birthDate) {
      birthDate.value = new Date(auth.user.birthDate).toISOString().split('T')[0]
    }
  }
})

async function onComplete() {
  if (!nickname.value || !walletAddress.value || !birthDate.value || !gender.value || !country.value) {
    error.value = t('onboarding.errorRequired')
    return
  }

  saving.value = true
  error.value = ''

  try {
    const { data } = await api.patch('/me/profile', {
      nickname: nickname.value,
      walletAddress: walletAddress.value,
      birthDate: birthDate.value,
      gender: gender.value,
      country: country.value
    })
    
    if (auth.user) {
      Object.assign(auth.user, data)
    }

    router.replace('/')
  } catch (err) {
    console.error('Profile update failed:', err)
    error.value = '정보 저장 중 오류가 발생했습니다. 다시 시도해 주세요.'
  } finally {
    saving.value = false
  }
}

function logout() {
  auth.logout()
  router.replace('/')
}
</script>

<template>
  <div class="setup-container fade-in">
    <div class="setup-card">
      <div class="setup-header">
        <h1 class="page-title">{{ $t('onboarding.welcome') }}</h1>
        <p class="setup-lead" v-html="$t('onboarding.welcomeLead')"></p>
      </div>

      <form @submit.prevent="onComplete" class="setup-form">
        <div class="form-rows">
          <div class="form-group">
            <label>{{ $t('mypage.nickname') }}</label>
            <input v-model="nickname" type="text" :placeholder="$t('onboarding.nicknamePlaceholder')" class="form-input" required />
          </div>

          <div class="form-group">
            <label>{{ $t('mypage.walletAddress') }}</label>
            <input v-model="walletAddress" type="text" placeholder="0x..." class="form-input" required />
            <p class="hint">{{ $t('onboarding.walletHint') }}</p>
          </div>

          <div class="form-grid-split">
            <div class="form-group">
              <label>{{ $t('mypage.birthDate') }}</label>
              <input v-model="birthDate" type="date" class="form-input" required />
            </div>

            <div class="form-group">
              <label>{{ $t('mypage.gender') }}</label>
              <select v-model="gender" class="form-input" required>
                <option value="">{{ $t('common.select') }}</option>
                <option value="MALE">{{ $t('onboarding.genderMaleShort') }}</option>
                <option value="FEMALE">{{ $t('onboarding.genderFemaleShort') }}</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>{{ $t('mypage.country') }}</label>
            <select v-model="country" class="form-input" required>
              <option value="">{{ $t('onboarding.countrySelect') }}</option>
              <option v-for="c in countries" :key="c.code" :value="c.code">{{ c.name }}</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div v-if="error" class="error-msg message-toast error">{{ error }}</div>

        <button type="submit" class="primary-btn" :disabled="saving">
          <span v-if="saving">{{ $t('common.saving') }}</span>
          <span v-else>{{ $t('onboarding.startBtn') }}</span>
        </button>

        <div class="setup-footer">
          <p>{{ $t('onboarding.wrongAccount') }}</p>
          <button type="button" class="btn-text" @click="logout">{{ $t('onboarding.logout') }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.setup-container {
  min-height: calc(100vh - 120px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.setup-card {
  width: 100%;
  max-width: 560px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 2rem;
  padding: 3rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.05);
}

.setup-header {
  text-align: center;
  margin-bottom: 3rem;
}

.setup-header h1 {
  font-size: 2rem;
  font-weight: 900;
  margin-bottom: 1rem;
  color: var(--text-h);
}

.setup-lead {
  color: var(--muted);
  line-height: 1.6;
  font-size: 1.05rem;
}

.setup-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-rows {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.form-input {
  width: 100%;
  padding: 1rem 1.25rem;
  border: 2px solid var(--border);
  border-radius: 16px;
  background: var(--bg-card);
  color: var(--text-h);
  font-size: 1rem;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

.form-grid-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

.hint {
  font-size: 0.8rem;
  color: var(--muted);
  margin-top: 0.25rem;
  font-weight: 500;
}

.primary-btn {
  width: 100%;
  padding: 1.25rem;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 20px;
  font-weight: 800;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.primary-btn:hover:not(:disabled) {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px var(--accent-soft);
  background: var(--accent-bright);
}

.primary-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.message-toast.error {
  padding: 1rem;
  border-radius: 14px;
  background: #fef2f2;
  color: #ef4444;
  border: 1px solid #fee2e2;
  font-size: 0.9rem;
  font-weight: 700;
  text-align: center;
}

.setup-footer {
  margin-top: 1rem;
  padding-top: 1.5rem;
  border-top: 1px dotted var(--border);
  text-align: center;
}

.setup-footer p {
  font-size: 0.85rem;
  color: var(--muted);
  margin-bottom: 0.5rem;
}

.btn-text {
  background: none;
  border: none;
  color: var(--accent);
  font-weight: 800;
  font-size: 0.9rem;
  cursor: pointer;
  text-decoration: underline;
  transition: opacity 0.2s;
}

.btn-text:hover { opacity: 0.7; }

.fade-in {
  animation: revealUp 0.8s cubic-bezier(0.2, 1, 0.2, 1) backwards;
}

@media (max-width: 600px) {
  .setup-card { padding: 2rem 1.5rem; }
  .form-grid-split { grid-template-columns: 1fr; }
}
</style>
