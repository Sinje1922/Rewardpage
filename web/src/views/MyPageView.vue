<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter } from 'vue-router'
import { api, API_BASE } from '../api/client'
import { useAuthStore } from '../stores/auth'

type SubRow = {
  id: string
  status: string
  mission: { title: string; campaign: { id: string; title: string; status: string } }
}

type WinRow = {
  rank: number
  campaign: { id: string; title: string }
}

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()

// Main Tabs: profile, activity
const activeTab = ref<'profile' | 'activity'>('profile')

// Sub Tabs (for Activity): active, won, closed
const subTab = ref<'active' | 'won' | 'closed'>('active')

// Data State
const walletAddress = ref('')
const birthDate = ref('')
const gender = ref('')
const country = ref('')
const nickname = ref('')
const avatarUrl = ref('')
const telegramHandle = ref('')
const discordHandle = ref('')
const youtubeHandle = ref('')
const instagramHandle = ref('')
const loading = ref(true)
const saving = ref(false)
const uploading = ref(false)
const message = ref('')
const isError = ref(false)

const fileInput = ref<HTMLInputElement | null>(null)

const subs = ref<SubRow[]>([])
const wins = ref<WinRow[]>([])
const activityErr = ref('')

onMounted(async () => {
  await loadAllData()
})

async function loadAllData() {
  loading.value = true
  try {
    const [userRes, subsRes, winsRes] = await Promise.all([
      api.get('/me'),
      api.get<SubRow[]>('/me/submissions'),
      api.get<WinRow[]>('/me/wins')
    ])
    
    const user = userRes.data
    walletAddress.value = user.walletAddress || ''
    nickname.value = user.nickname || ''
    avatarUrl.value = user.avatarUrl || ''
    gender.value = user.gender || ''
    country.value = user.country || ''
    telegramHandle.value = user.telegramHandle || ''
    discordHandle.value = user.discordHandle || ''
    youtubeHandle.value = user.youtubeHandle || ''
    instagramHandle.value = user.instagramHandle || ''

    if (user.birthDate) {
      birthDate.value = new Date(user.birthDate).toISOString().split('T')[0]
    } else if (user.birthYear) {
      birthDate.value = `${user.birthYear}-01-01`
    } else {
      birthDate.value = ''
    }
    
    subs.value = subsRes.data
    wins.value = winsRes.data
  } catch (err) {
    console.error('Failed to load data:', err)
    activityErr.value = t('common.errorLoad')
  } finally {
    loading.value = false
  }
}

async function triggerFileUpload() {
  fileInput.value?.click()
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files?.length) return

  const file = target.files[0]
  const formData = new FormData()
  formData.append('file', file)

  uploading.value = true
  try {
    const { data } = await api.post<{ url: string }>('/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    avatarUrl.value = data.url
    await saveProfile()
  } catch (err: any) {
    console.error('Upload failed:', err)
    alert(err.response?.data?.error || '업로드 실패')
  } finally {
    uploading.value = false
    target.value = ''
  }
}

async function saveProfile() {
  if (saving.value) return
  saving.value = true
  message.value = ''
  isError.value = false

  try {
    const res = await api.patch('/me/profile', {
      walletAddress: walletAddress.value,
      birthDate: birthDate.value || null,
      nickname: nickname.value,
      avatarUrl: avatarUrl.value,
      gender: gender.value || null,
      country: country.value || null,
      telegramHandle: telegramHandle.value || null,
      discordHandle: discordHandle.value || null,
      youtubeHandle: youtubeHandle.value || null,
      instagramHandle: instagramHandle.value || null
    })
    
    if(auth.user) {
        auth.user.walletAddress = res.data.walletAddress
        auth.user.birthDate = res.data.birthDate
        auth.user.nickname = res.data.nickname
        auth.user.avatarUrl = res.data.avatarUrl
        auth.user.gender = res.data.gender
        auth.user.country = res.data.country
        auth.user.telegramHandle = res.data.telegramHandle
        auth.user.discordHandle = res.data.discordHandle
        auth.user.youtubeHandle = res.data.youtubeHandle
        auth.user.instagramHandle = res.data.instagramHandle
    }

    message.value = t('mypage.saveSuccess')
  } catch (err) {
    console.error('Save failed:', err)
    message.value = t('mypage.saveFail')
    isError.value = true
  } finally {
    saving.value = false
  }
}

async function handleWithdrawal() {
  if (!confirm(t('mypage.withdrawConfirm'))) return
  
  try {
    await api.delete('/me/profile')
    alert(t('mypage.withdrawSuccess'))
    auth.logout()
    router.push('/')
  } catch (err) {
    console.error('Withdrawal failed:', err)
    alert(t('common.errorLoad'))
  }
}

function linkDiscord() {
  window.location.href = `${API_BASE}/oauth/discord/login?token=${auth.token}`
}

function linkTelegram() {
  const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'PickQ_bot'
  window.open(`https://t.me/${botName}?start=${auth.user?.id}`, '_blank')
  alert("텔레그램 앱에서 '시작(Start)' 버튼을 누르면 연동이 완료됩니다.")
}

function linkYouTube() {
  // 유튜브 전용 OAuth 인증 (구글 계정 사용)
  window.location.href = `${API_BASE}/oauth/youtube/login?token=${auth.token}`
}

async function unlinkSNS(type: 'telegram' | 'discord' | 'youtube') {
  if (!confirm(`${type} 연동을 해제하시겠습니까?`)) return
  
  try {
    const fieldMap = {
      telegram: 'telegramHandle',
      discord: 'discordHandle',
      youtube: 'youtubeHandle'
    } as const
    
    await api.patch('/me/profile', { [fieldMap[type]]: null })
    
    // 로컬 상태 업데이트
    if (type === 'telegram') telegramHandle.value = ''
    if (type === 'discord') discordHandle.value = ''
    if (type === 'youtube') youtubeHandle.value = ''
    
    if (auth.user) {
      (auth.user as any)[fieldMap[type]] = null
    }
    
    alert("연동이 해제되었습니다.")
  } catch (err) {
    console.error('Unlink failed:', err)
    alert("연동 해제에 실패했습니다.")
  }
}

</script>

<template>
  <div class="mypage-dashboard">
    <div class="dashboard-layout">
      
      <!-- Main Content Area (Left) -->
      <main class="dashboard-main">
        <transition name="fade-slide" mode="out-in">
          <!-- Profile Section -->
          <div v-if="activeTab === 'profile'" key="profile" class="dashboard-card">
            <h2 class="card-title">{{ $t('mypage.title') }}</h2>
            
            <div class="profile-form">
              <!-- Profile Image Upload Area -->
              <div class="avatar-upload-container">
                <div class="avatar-wrapper">
                  <div class="avatar-main">
                    <img v-if="avatarUrl && avatarUrl.startsWith('/')" :src="avatarUrl" class="avatar-img" alt="Avatar" />
                    <span v-else class="avatar-placeholder">{{ avatarUrl || '👤' }}</span>
                    <div v-if="uploading" class="upload-loader">
                      <div class="spinner"></div>
                    </div>
                  </div>
                  <button type="button" class="edit-btn" @click="triggerFileUpload" :title="$t('mypage.avatar')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <input ref="fileInput" type="file" accept="image/*" class="hidden-input" @change="handleFileChange" />
                </div>
                <p class="avatar-hint">{{ $t('mypage.avatar') }}</p>
              </div>

              <div class="form-rows">
                <div class="form-group">
                  <label>{{ $t('mypage.nickname') }}</label>
                  <input 
                    v-model="nickname" 
                    type="text" 
                    :placeholder="$t('mypage.nicknameHint')"
                    class="form-input"
                  />
                </div>

                <div class="form-group">
                  <label>{{ $t('auth.email') }}</label>
                  <div class="readonly-box">{{ auth.user?.email }}</div>
                </div>

                <div class="form-group">
                  <label>{{ $t('mypage.birthDate') }}</label>
                  <input 
                    v-model="birthDate" 
                    type="date" 
                    class="form-input"
                  />
                </div>

                <div class="form-group">
                  <label>{{ $t('mypage.walletAddress') }}</label>
                  <input 
                    v-model="walletAddress" 
                    type="text" 
                    :placeholder="$t('mypage.walletHint')"
                    class="form-input"
                  />
                </div>

                <div class="form-grid-split">
                  <div class="form-group">
                    <label>{{ $t('mypage.gender') }}</label>
                    <select v-model="gender" class="form-input">
                      <option value="">{{ $t('common.select') }}</option>
                      <option value="MALE">{{ $t('onboarding.genderMaleShort') }}</option>
                      <option value="FEMALE">{{ $t('onboarding.genderFemaleShort') }}</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>{{ $t('mypage.country') }}</label>
                    <select v-model="country" class="form-input">
                      <option value="">{{ $t('onboarding.countrySelect') }}</option>
                      <option v-for="c in [
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
                      ].sort((a, b) => a.name.localeCompare(b.name))" :key="c.code" :value="c.code">{{ c.name }}</option>
                    </select>
                  </div>
                </div>

                <!-- SNS Linking Section (OAuth Style) -->
                <div class="sns-linking-section">
                  <h3 class="sub-section-title">SNS 계정 연동</h3>
                  <p class="section-hint">공식 인증을 통해 계정을 연동해 주세요.</p>
                  
                  <div class="sns-auth-grid">
                    <!-- Telegram -->
                    <div class="sns-auth-card" :class="{ linked: !!telegramHandle }">
                      <div class="sns-info">
                        <span class="sns-icon telegram">✈️</span>
                        <div class="sns-text">
                          <span class="sns-name">Telegram</span>
                          <span class="sns-status">{{ telegramHandle || '미연동' }}</span>
                        </div>
                      </div>
                      <div class="auth-actions">
                        <button v-if="telegramHandle" type="button" class="auth-action-btn unlink" @click="unlinkSNS('telegram')">
                          해제
                        </button>
                        <button type="button" class="auth-action-btn telegram" @click="linkTelegram">
                          {{ telegramHandle ? '재연동' : '인증하기' }}
                        </button>
                      </div>
                    </div>

                    <!-- Discord -->
                    <div class="sns-auth-card" :class="{ linked: !!discordHandle }">
                      <div class="sns-info">
                        <span class="sns-icon discord">💬</span>
                        <div class="sns-text">
                          <span class="sns-name">Discord</span>
                          <span class="sns-status">{{ discordHandle || '미연동' }}</span>
                        </div>
                      </div>
                      <div class="auth-actions">
                        <button v-if="discordHandle" type="button" class="auth-action-btn unlink" @click="unlinkSNS('discord')">
                          해제
                        </button>
                        <button type="button" class="auth-action-btn discord" @click="linkDiscord">
                          {{ discordHandle ? '재연동' : '인증하기' }}
                        </button>
                      </div>
                    </div>

                    <!-- YouTube -->
                    <div class="sns-auth-card" :class="{ linked: !!youtubeHandle }">
                      <div class="sns-info">
                        <span class="sns-icon youtube">📺</span>
                        <div class="sns-text">
                          <span class="sns-name">YouTube</span>
                          <span class="sns-status">{{ youtubeHandle || '미연동' }}</span>
                        </div>
                      </div>
                      <div class="auth-actions">
                        <button v-if="youtubeHandle" type="button" class="auth-action-btn unlink" @click="unlinkSNS('youtube')">
                          해제
                        </button>
                        <button type="button" class="auth-action-btn youtube" @click="linkYouTube">
                          {{ youtubeHandle ? '재연동' : '인증하기' }}
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

              </div>

              <div v-if="message" :class="['message-toast', { error: isError }]">
                {{ message }}
              </div>

              <div class="actions-stack">
                <button @click="saveProfile" :disabled="saving" class="action-btn primary-btn">
                  <span v-if="saving">{{ $t('ops.saving') }}</span>
                  <span v-else>{{ $t('mypage.save') }}</span>
                </button>

                <div class="danger-zone">
                  <button @click="handleWithdrawal" class="withdraw-btn">
                    {{ $t('mypage.withdraw') }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Activity Section with Sub Tabs -->
          <div v-else key="activity" class="dashboard-card">
            <h2 class="card-title">{{ $t('nav.myActivity') }}</h2>
            
            <div class="sub-tabs">
              <button 
                @click="subTab = 'active'" 
                :class="['sub-tab-btn', { active: subTab === 'active' }]"
              >
                {{ $t('activity.active') }}
              </button>
              <button 
                @click="subTab = 'won'" 
                :class="['sub-tab-btn', { active: subTab === 'won' }]"
              >
                {{ $t('activity.won') }}
              </button>
              <button 
                @click="subTab = 'closed'" 
                :class="['sub-tab-btn', { active: subTab === 'closed' }]"
              >
                {{ $t('activity.closed') }}
              </button>
            </div>

            <div class="sub-tabs-mobile">
              <select v-model="subTab" class="mobile-select">
                <option value="active">{{ $t('activity.active') }}</option>
                <option value="won">{{ $t('activity.won') }}</option>
                <option value="closed">{{ $t('activity.closed') }}</option>
              </select>
              <span class="select-arrow">▾</span>
            </div>

            <div class="sub-content">
              <transition name="fade" mode="out-in">
                <!-- Active Campaigns -->
                <div v-if="subTab === 'active'" key="active" class="list-container">
                  <div v-if="subs.filter(s => s.mission.campaign.status === 'ACTIVE').length" class="mini-grid">
                    <div v-for="s in subs.filter(s => s.mission.campaign.status === 'ACTIVE')" :key="s.id" class="activity-item">
                      <RouterLink :to="`/campaigns/${s.mission.campaign.id}`" class="item-head">
                        {{ s.mission.campaign.title }}
                      </RouterLink>
                      <p class="item-body">{{ s.mission.title }}</p>
                      <span :class="['tag', s.status.toLowerCase()]">{{ s.status }}</span>
                    </div>
                  </div>
                  <p v-else class="empty-msg">{{ $t('activity.noParticipated') }}</p>
                </div>

                <!-- Won Campaigns -->
                <div v-else-if="subTab === 'won'" key="won" class="list-container">
                  <div v-if="wins.length" class="mini-grid">
                    <div v-for="w in wins" :key="w.campaign.id + '-' + w.rank" class="activity-item highlight">
                      <RouterLink :to="`/campaigns/${w.campaign.id}`" class="item-head">
                        {{ w.campaign.title }}
                      </RouterLink>
                      <p class="winner-label">🏆 {{ $t('activity.winRank', { rank: w.rank }) }}</p>
                    </div>
                  </div>
                  <p v-else class="empty-msg">{{ $t('activity.noWins') }}</p>
                </div>

                <!-- Closed Campaigns -->
                <div v-else key="closed" class="list-container">
                  <div v-if="subs.filter(s => ['CLOSED', 'DRAWN'].includes(s.mission.campaign.status)).length" class="mini-grid">
                    <div v-for="s in subs.filter(s => ['CLOSED', 'DRAWN'].includes(s.mission.campaign.status))" :key="s.id" class="activity-item muted">
                      <div class="item-head">{{ s.mission.campaign.title }}</div>
                      <p class="item-body">{{ s.mission.title }}</p>
                      <span class="tag closed">CLOSED</span>
                    </div>
                  </div>
                  <p v-else class="empty-msg">{{ $t('activity.noWins') }}</p>
                </div>
              </transition>
            </div>
          </div>
        </transition>
      </main>

      <aside class="dashboard-sidebar">
        <div class="user-brief pc-only">
          <div class="avatar-circle">
            <img v-if="auth.user?.avatarUrl && auth.user.avatarUrl.startsWith('/')" :src="auth.user.avatarUrl" class="sidebar-avatar-img" />
            <span v-else>{{ auth.user?.nickname?.[0] || auth.user?.email?.[0].toUpperCase() || '?' }}</span>
          </div>
          <p class="user-nickname" v-if="auth.user?.nickname">{{ auth.user.nickname }}</p>
          <p class="user-email" :class="{ 'small-email': auth.user?.nickname }">{{ auth.user?.email }}</p>
          <div class="points-badge">
            <span class="point-val">{{ auth.user?.pointBalance.toLocaleString() }}</span>
            <span class="point-unit">P</span>
          </div>
        </div>

        <nav class="sidebar-nav">
          <button 
            @click="activeTab = 'profile'" 
            :class="['nav-item', { active: activeTab === 'profile' }]"
          >
            <span class="ico">👤</span>
            <span class="lbl">{{ $t('mypage.title') }}</span>
          </button>
          <button 
            @click="activeTab = 'activity'" 
            :class="['nav-item', { active: activeTab === 'activity' }]"
          >
            <span class="ico">📜</span>
            <span class="lbl">{{ $t('nav.myActivity') }}</span>
          </button>
        </nav>
      </aside>

    </div>
  </div>
</template>

<style scoped>
.mypage-dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.dashboard-layout {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}

.dashboard-main {
  flex: 1;
  min-width: 0;
}

.dashboard-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 2.5rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.03);
}

.card-title {
  font-size: 1.5rem;
  font-weight: 800;
  margin-bottom: 2rem;
  color: var(--text-h);
}

.dashboard-sidebar {
  width: 280px;
  position: sticky;
  top: 6rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.user-brief {
  background: var(--bg-card);
  border: 1px solid var(--border);
  padding: 2rem;
  border-radius: 24px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
}

.avatar-circle {
  width: 64px;
  height: 64px;
  background: var(--accent);
  color: white;
  margin: 0 auto 1rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  font-weight: 800;
  overflow: hidden;
  border: 2px solid var(--accent-border);
}

.sidebar-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-nickname {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-h);
  margin-bottom: 0.25rem;
}

.user-email {
  font-size: 0.9rem;
  color: var(--muted);
  word-break: break-all;
  margin-bottom: 1rem;
}

.user-email.small-email {
  font-size: 0.8rem;
  opacity: 0.7;
}

.points-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: var(--accent-soft);
  padding: 0.5rem 1rem;
  border-radius: 99px;
  font-weight: 800;
  color: var(--accent);
}

.profile-form {
  display: flex;
  flex-direction: column;
}

.avatar-upload-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2.5rem;
}

.avatar-wrapper {
  position: relative;
  width: 120px;
  height: 120px;
}

.avatar-main {
  width: 100%;
  height: 100%;
  background: var(--bg-card);
  border-radius: 50%;
  border: 4px solid var(--accent);
  box-shadow: 0 10px 30px var(--accent-soft);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 3.5rem;
  color: var(--accent);
}

.edit-btn {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 38px;
  height: 38px;
  background: var(--accent);
  color: white;
  border: 3px solid var(--bg-card);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
}

.edit-btn:hover {
  transform: scale(1.15);
  background: var(--accent-bright);
}

.hidden-input {
  display: none;
}

.avatar-hint {
  margin-top: 1rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
}

.upload-loader {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

:root.dark .upload-loader {
  background: rgba(15, 23, 42, 0.6);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--accent-soft);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Form Styles */
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

.readonly-box {
  padding: 1rem 1.25rem;
  background: var(--bg-deep);
  border-radius: 16px;
  color: var(--muted);
  border: 1px dashed var(--border);
  font-weight: 500;
}

.form-grid-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

.sns-linking-section {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px dashed var(--border);
}

.sub-section-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-h);
  margin-bottom: 0.5rem;
}

.section-hint {
  font-size: 0.9rem;
  color: var(--muted);
  margin-bottom: 1.5rem;
}

.mt-4 { margin-top: 1rem; }

/* SNS Auth Grid */
.sns-auth-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.sns-auth-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem;
  background: var(--bg-deep);
  border: 1px solid var(--border);
  border-radius: 20px;
  transition: all 0.3s ease;
}

.sns-auth-card.linked {
  background: var(--panel);
  border-color: var(--accent-border);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.sns-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.sns-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background: var(--bg-card);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.sns-icon.telegram { color: #0088cc; }
.sns-icon.discord { color: #5865F2; }
.sns-icon.youtube { color: #FF0000; }
.sns-icon.instagram { color: #E4405F; }

.sns-text {
  display: flex;
  flex-direction: column;
}

.sns-name {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--text-h);
}

.sns-status {
  font-size: 0.8rem;
  color: var(--muted);
}

.auth-action-btn {
  padding: 0.6rem 1rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.auth-action-btn.telegram { background: #0088cc; color: white !important; }
.auth-action-btn.discord { background: #5865F2; color: white !important; }
.auth-action-btn.youtube { background: #FF0000; color: white !important; }
.auth-action-btn.instagram { background: linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%); color: white !important; }

.auth-action-btn:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
}

.auth-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.auth-action-btn.unlink {
  background: var(--bg-deep);
  color: var(--muted);
  border: 1px solid var(--border);
}

:root.dark .auth-action-btn.unlink {
  background: rgba(255, 255, 255, 0.05);
}

.auth-action-btn.unlink:hover {
  background: #fee2e2;
  color: #ef4444;
  border-color: #fecaca;
}

:root.dark .auth-action-btn.unlink:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.3);
}

.auth-btn-wrapper {
  min-width: 100px;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

/* Sidebar Nav */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  background: transparent;
  border: none;
  border-radius: 18px;
  color: var(--muted);
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  text-align: left;
}

.nav-item:hover {
  background: var(--bg-deep);
  color: var(--text-h);
}

.nav-item.active {
  background: var(--accent);
  color: white;
  box-shadow: 0 8px 20px var(--accent-soft);
}

.nav-item .ico { font-size: 1.2rem; }

/* Sub Tabs (Activity) */
.sub-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  background: var(--bg-deep);
  padding: 0.4rem;
  border-radius: 18px;
  overflow-x: auto;
  justify-content: flex-start;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
}

.sub-tabs::-webkit-scrollbar {
  display: none;
}

.sub-tab-btn {
  flex: none;
  padding: 0.75rem 1.25rem;
  border: none;
  background: transparent;
  border-radius: 14px;
  font-weight: 800;
  font-size: 0.9rem;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.sub-tab-btn.active {
  background: var(--bg-card);
  color: var(--accent);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.sub-tabs-mobile {
  display: none;
  position: relative;
  margin-bottom: 2rem;
}

.mobile-select {
  width: 100%;
  padding: 1rem 1.25rem;
  background: var(--bg-deep);
  border: 1px solid var(--border);
  border-radius: 16px;
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-h);
  appearance: none;
  cursor: pointer;
}

.select-arrow {
  position: absolute;
  right: 1.25rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--accent);
  font-size: 0.8rem;
}

.mini-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.25rem;
}

.activity-item {
  padding: 1.5rem;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--bg-card);
  transition: all 0.3s ease;
}

.activity-item:hover {
  transform: translateY(-4px);
  border-color: var(--accent-border);
}

.activity-item .item-head {
  font-weight: 800;
  color: var(--accent);
  text-decoration: none;
  display: block;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.item-body { font-size: 0.95rem; color: var(--muted); margin-bottom: 1rem; }

.activity-item.highlight {
  border-color: var(--accent-border);
  background: var(--accent-soft);
}

.winner-label { font-weight: 900; color: var(--accent); font-size: 1rem; }

.activity-item.muted { opacity: 0.6; filter: grayscale(0.8); }

.tag {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.3rem 0.75rem;
  border-radius: 8px;
  text-transform: uppercase;
}
.tag.approved { background: var(--mint-soft); color: var(--mint); }
.tag.pending { background: #fef9c3; color: #a16207; }
.tag.closed { background: var(--bg-deep); color: var(--muted); }

.actions-stack {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  margin-top: 3rem;
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

.danger-zone {
  border-top: 1px solid var(--border);
  padding-top: 2.5rem;
  text-align: center;
}

.withdraw-btn {
  background: transparent;
  color: #ef4444;
  border: 1px solid #fee2e2;
  padding: 0.85rem 1.75rem;
  border-radius: 14px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
}

.withdraw-btn:hover {
  background: #fef2f2;
  border-color: #fca5a5;
}

.message-toast {
  padding: 1.1rem;
  border-radius: 16px;
  background: var(--mint-soft);
  color: var(--mint);
  font-weight: 700;
  font-size: 0.95rem;
  margin-top: 1.5rem;
  text-align: center;
  border: 1px solid var(--mint-soft);
}
.message-toast.error { background: #fef2f2; color: #ef4444; border-color: #fee2e2; }

.empty-msg { text-align: center; padding: 4rem; color: var(--muted); font-weight: 600; opacity: 0.7; }

/* Transitions */
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.4s cubic-bezier(0.2, 1, 0.2, 1); }
.fade-slide-enter-from { opacity: 0; transform: translateY(15px); }
.fade-slide-leave-to { opacity: 0; transform: translateY(-15px); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 950px) {
  .dashboard-layout { flex-direction: column-reverse; gap: 3rem; }
  .dashboard-sidebar { width: 100%; position: static; }
  .sidebar-nav { flex-direction: row; }
  .nav-item { padding: 1rem; justify-content: center; }
  .nav-item .lbl { display: none; }
  
  .dashboard-card { padding: 1.5rem; }
  .sub-tabs { display: none; }
  .sub-tabs-mobile { display: block; }
  .form-grid-split { grid-template-columns: 1fr; }
  .mini-grid { grid-template-columns: 1fr; }
}
</style>
