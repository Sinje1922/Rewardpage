<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api, getFileUrl } from '../api/client'
import { useAuthStore } from '../stores/auth'

type Mission = {
  id: string
  type: string
  title: string
  description: string
  config: string
  sortOrder: number
}

type CampaignDetail = {
  id: string
  title: string
  description: string
  companyName: string
  companyLogoUrl: string
  status: string
  winnerCount: number
  totalRewardPoints: number
  startsAt: string | null
  endsAt: string | null
  missions: Mission[]
  mySubmissions?: { missionId: string; status: string }[]
}

type Participant = { email: string }
type WinnerRow = { rank: number; points: number; user: { email: string } }

const { t } = useI18n()
const route = useRoute()
const auth = useAuthStore()
const camp = ref<CampaignDetail | null>(null)
const winners = ref<WinnerRow[]>([])
const participants = ref<Participant[]>([])
const participantCount = ref(0)
const err = ref('')
const msg = ref('')

const typeIcons: Record<string, string> = {
  LINK_VISIT: '🔗',
  SURVEY: '📝',
  CODE: '🔑',
  QUIZ: '❓',
  CHECKIN: '📍',
  FILE_UPLOAD: '📁',
  TELEGRAM_JOIN: '✈️',
  DISCORD_JOIN: '👾',
  YOUTUBE_WATCH: '📺'
}

function parseCfg(raw: string) {
  try {
    return JSON.parse(raw || '{}') as Record<string, unknown>
  } catch {
    return {}
  }
}

const myStatus = (mid: string) => camp.value?.mySubmissions?.find((s) => s.missionId === mid)?.status

const codeInput = ref<Record<string, string>>({})
const dwellInput = ref<Record<string, number>>({})
const quizPick = ref<Record<string, number>>({})
const surveyAnswers = ref<Record<string, Record<string, string | number>>>({})
const checkConfirm = ref<Record<string, boolean>>({})
const ytRemaining = ref<Record<string, number>>({})
const ytTimer = ref<Record<string, any>>({})
const telegramHandle = ref<Record<string, string>>({})
const discordConnected = ref<Record<string, boolean>>({})

const showCopyMsg = ref(false)

async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    showCopyMsg.value = true
    setTimeout(() => {
      showCopyMsg.value = false
    }, 2000)
  } catch {
    /* ignore */
  }
}

async function loadParticipants() {
  const id = route.params.id as string
  try {
    const p = await api.get<{ count: number; participants: Participant[] }>(`/campaigns/${id}/participants`)
    participants.value = p.data.participants
    participantCount.value = p.data.count
  } catch {
    /* ignore */
  }
}

onMounted(async () => {
  const id = route.params.id as string
  try {
    const { data } = await api.get<CampaignDetail>(`/campaigns/${id}`)
    camp.value = data
    
    // Auto-fill handles from profile
    if (auth.user) {
      data.missions.forEach(m => {
        if (m.type === 'TELEGRAM_JOIN' && auth.user?.telegramHandle) {
          telegramHandle.value[m.id] = auth.user.telegramHandle
        }
        if (m.type === 'DISCORD_JOIN' && auth.user?.discordId) {
          // If we have a discordId in profile, we might consider it connected
          // Or just fill the input if there was one
        }
      })
    }

    if (['DRAWN', 'CLOSED', 'ACTIVE'].includes(data.status)) {
      try {
        const w = await api.get<WinnerRow[]>(`/campaigns/${id}/winners`)
        winners.value = w.data
      } catch {
        /* ignore */
      }
    }
    await loadParticipants()
    initYoutubePlayers()
  } catch {
    err.value = t('common.errorLoad')
  }
})

function initYoutubePlayers() {
  if (!camp.value) return
  const youtubeMissions = camp.value.missions.filter(m => m.type === 'YOUTUBE_WATCH')
  if (youtubeMissions.length === 0) return

  if (!(window as any).YT) {
    const tag = document.createElement('script')
    tag.src = "https://www.youtube.com/iframe_api"
    const firstScriptTag = document.getElementsByTagName('script')[0]
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
  }

  (window as any).onYouTubeIframeAPIReady = () => {
    youtubeMissions.forEach(m => {
      const cfg = parseCfg(m.config)
      const targetSec = Number(cfg.targetSeconds || 10)
      ytRemaining.value[m.id] = targetSec
      
      new (window as any).YT.Player(`yt-player-${m.id}`, {
        height: '240',
        width: '100%',
        videoId: cfg.videoId,
        events: {
          onStateChange: (event: any) => {
            if (event.data === (window as any).YT.PlayerState.PLAYING) {
              startTimer(m.id)
            } else {
              stopTimer(m.id)
            }
          }
        }
      })
    })
  }
}

function startTimer(mid: string) {
  if (ytTimer.value[mid]) return
  ytTimer.value[mid] = setInterval(() => {
    if (ytRemaining.value[mid] > 0) {
      ytRemaining.value[mid]--
    } else {
      stopTimer(mid)
    }
  }, 1000)
}

function stopTimer(mid: string) {
  if (ytTimer.value[mid]) {
    clearInterval(ytTimer.value[mid])
    ytTimer.value[mid] = null
  }
}

async function verifyTelegram(m: Mission) {
  err.value = ''
  msg.value = ''
  const handle = telegramHandle.value[m.id]
  if (!handle) {
    err.value = '텔레그램 핸들을 입력해 주세요.'
    return
  }
  try {
    await api.post('/verify/telegram', { missionId: m.id, handle })
    msg.value = '참여가 확인되었습니다!'
  } catch (e: any) {
    err.value = e.response?.data?.error || '참여 확인에 실패했습니다.'
  }
}

async function verifyDiscord(m: Mission) {
  err.value = ''
  msg.value = ''
  try {
    await api.post('/verify/discord', { missionId: m.id })
    discordConnected.value[m.id] = true
    msg.value = '디스코드 연동이 확인되었습니다!'
  } catch (e: any) {
    err.value = e.response?.data?.error || '디스코드 확인 실패'
  }
}

async function logVisit(m: Mission) {
  if (!auth.token) {
    err.value = '로그인이 필요합니다.'
    return
  }
  const cfg = parseCfg(m.config)
  const url = String(cfg.linkUrl || '')
  if (url) window.open(url, '_blank', 'noopener,noreferrer')
  try {
    await api.post(`/missions/${m.id}/event`, { name: 'link_click', meta: { url } })
  } catch {
    /* ignore */
  }
}

async function submitMission(m: Mission) {
  err.value = ''
  msg.value = ''
  if (!auth.token) {
    err.value = '로그인이 필요합니다.'
    return
  }
  let payload: Record<string, unknown> = {}
  if (m.type === 'LINK_VISIT') {
    payload = { dwellSeconds: Number(dwellInput.value[m.id] ?? 0) }
  } else if (m.type === 'CODE') {
    payload = { code: codeInput.value[m.id] ?? '' }
  } else if (m.type === 'SURVEY') {
    const cfg = parseCfg(m.config)
    const qs = (cfg.surveyQuestions as any[]) || []
    if (qs.length === 0) {
      payload = { code: codeInput.value[m.id] ?? '' }
    } else {
      payload = { answers: surveyAnswers.value[m.id] || {} }
    }
  } else if (m.type === 'QUIZ') {
    payload = { selectedIndex: quizPick.value[m.id] }
  } else if (m.type === 'CHECKIN') {
    if (!checkConfirm.value[m.id]) {
      err.value = t('common.checkRequired')
      return
    }
    payload = {}
  } else if (m.type === 'FILE_UPLOAD') {
    payload = { fileUrl: codeInput.value[m.id] ?? '' }
  } else if (m.type === 'TELEGRAM_JOIN') {
    payload = { handle: telegramHandle.value[m.id] || '' }
  } else if (m.type === 'DISCORD_JOIN') {
    payload = { status: 'joined' }
  } else if (m.type === 'YOUTUBE_WATCH') {
    if (ytRemaining.value[m.id] > 0) {
      err.value = '영상을 더 시청해야 합니다.'
      return
    }
    payload = { watched: true }
  }
  try {
    await api.post(`/missions/${m.id}/submit`, { payload })
    msg.value = t('common.submitSuccess')
    const { data } = await api.get<CampaignDetail>(`/campaigns/${route.params.id}`)
    camp.value = data
    await loadParticipants()
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { error?: string } } }
    err.value = ax.response?.data?.error ?? t('common.submitFail')
  }
}

const sortedMissions = computed(() => [...(camp.value?.missions ?? [])].sort((a, b) => a.sortOrder - b.sortOrder))
</script>

<template>
  <div v-if="camp" class="detail-container">
    <div class="detail-header">
      <div v-if="camp.companyName || camp.companyLogoUrl" class="company-brand">
        <img v-if="camp.companyLogoUrl" :src="getFileUrl(camp.companyLogoUrl)" alt="" class="company-logo" />
        <span v-if="camp.companyName" class="brand-name">{{ camp.companyName }}</span>
      </div>
      <h1 class="page-title">{{ camp.title }}</h1>
      <p class="description-text">{{ camp.description }}</p>
      
      <div class="meta-row">
        <span class="badge">{{ $t('detail.statusLabel', { status: camp.status }) }}</span>
        <span v-if="camp.missions" class="meta-item">{{ $t('detail.missionsCountLabel', { count: camp.missions.length }) }}</span>
        <span v-if="camp.totalRewardPoints > 0" class="badge accent-badge">
          {{ $t('detail.rewardLabel', { points: camp.totalRewardPoints.toLocaleString() }) }}
        </span>
        <button type="button" class="btn copy-btn" @click="copyLink">
          🔗 {{ showCopyMsg ? $t('detail.copied') : $t('detail.copyLink') }}
        </button>
      </div>

      <div class="info-footer">
        <p v-if="camp.totalRewardPoints > 0" class="reward-notice">
          {{ $t('detail.rewardPerWinner', { points: Math.floor(camp.totalRewardPoints / camp.winnerCount).toLocaleString() }) }}
        </p>
        <div v-if="camp.startsAt || camp.endsAt" class="period-text">
          📅 {{ $t('detail.period', {
            start: camp.startsAt ? new Date(camp.startsAt).toLocaleString() : $t('detail.always'),
            end: camp.endsAt ? new Date(camp.endsAt).toLocaleString() : $t('campaign.durationUntilEnd')
          }) }}
        </div>
      </div>
    </div>

    <!-- Winners Section -->
    <section v-if="winners.length" class="card winners-card">
      <h2 class="section-title">{{ $t('detail.winnersTitle') }}</h2>
      <div class="winners-grid">
        <div v-for="w in winners" :key="w.rank" class="winner-row">
          {{ $t('detail.winnerRow', { rank: w.rank, email: w.user.email }) }} 
          <span v-if="w.points > 0" class="winner-points">({{ w.points.toLocaleString() }}P)</span>
        </div>
      </div>
    </section>

    <!-- Feedback Messages -->
    <div class="status-messages">
      <p v-if="msg" class="success-msg">{{ msg }}</p>
      <p v-if="err" class="err-msg">{{ err }}</p>
    </div>

    <!-- Missions Grid -->
    <div class="grid">
      <div v-for="m in sortedMissions" :key="m.id" class="card mission-card" :class="{ completed: myStatus(m.id) === 'APPROVED' }">
        <div class="mission-header">
          <div class="mission-type">
            <span class="type-icon">{{ typeIcons[m.type] || '✨' }}</span>
            <span v-if="camp.totalRewardPoints > 0" class="point-badge">
              {{ $t('detail.missionWait', { points: Math.floor(camp.totalRewardPoints / camp.winnerCount).toLocaleString() }) }}
            </span>
          </div>
          <span class="badge" :class="{ 'badge-done': myStatus(m.id) === 'APPROVED' }">
            {{ myStatus(m.id) ? myStatus(m.id) : $t('detail.unparticipated') }}
          </span>
        </div>

        <h3 class="mission-title">{{ m.title }}</h3>
        <p class="mission-desc">{{ m.description }}</p>

        <div class="mission-body">
          <template v-if="m.type === 'LINK_VISIT'">
            <button type="button" class="btn full-width" @click="logVisit(m)">{{ $t('detail.linkOpen') }}</button>
            <div class="field mt-3">
              <label>{{ $t('detail.dwellTime') }}</label>
              <input v-model.number="dwellInput[m.id]" type="number" min="0" placeholder="0" />
            </div>
          </template>

          <template v-else-if="m.type === 'SURVEY'">
            <div v-if="parseCfg(m.config).surveyNote" class="survey-note">
              {{ parseCfg(m.config).surveyNote }}
            </div>

            <div v-if="(parseCfg(m.config).surveyQuestions as any[])?.length" class="survey-list">
              <div v-for="(qs, qi) in (parseCfg(m.config).surveyQuestions as any[])" :key="qs.id" class="survey-item">
                <p class="question-text">{{ qi + 1 }}. {{ qs.question }}</p>
                
                <template v-if="qs.type === 'SUBJECTIVE'">
                  <textarea 
                    v-model="(surveyAnswers[m.id] = surveyAnswers[m.id] || {})[qs.id]"
                    placeholder="답변을 입력해 주세요"
                    class="survey-textarea"
                  />
                </template>
                
                <template v-else-if="qs.type === 'OBJECTIVE'">
                  <div class="radio-group">
                    <label v-for="(opt, oi) in qs.options" :key="oi" class="radio-label">
                      <input 
                        type="radio" 
                        :name="'survey-' + m.id + '-' + qs.id" 
                        :value="oi"
                        @change="(surveyAnswers[m.id] = surveyAnswers[m.id] || {})[qs.id] = oi"
                      />
                      <span>{{ opt }}</span>
                    </label>
                  </div>
                </template>
              </div>
            </div>
            
            <button v-if="parseCfg(m.config).linkUrl" type="button" class="btn btn-sm full-width" @click="logVisit(m)">🔗 추가 링크 열기</button>
          </template>

          <template v-else-if="m.type === 'QUIZ'">
            <p class="quiz-question">{{ String(parseCfg(m.config).quizQuestion ?? '') }}</p>
            <div
              v-for="(opt, idx) in (parseCfg(m.config).quizOptions as string[] | undefined) ?? []"
              :key="idx"
              class="quiz-option"
            >
              <input :id="'q-' + m.id + '-' + idx" v-model.number="quizPick[m.id]" type="radio" :value="idx" />
              <label :for="'q-' + m.id + '-' + idx">{{ opt }}</label>
            </div>
          </template>

          <template v-else-if="m.type === 'CHECKIN'">
            <label class="check-label">
              <input v-model="checkConfirm[m.id]" type="checkbox" />
              <span>{{ $t('detail.understand') }}</span>
            </label>
          </template>

          <template v-else-if="m.type === 'FILE_UPLOAD'">
            <div class="field">
              <label>{{ $t('detail.fileUrl') }}</label>
              <input v-model="codeInput[m.id]" type="url" placeholder="https://..." />
            </div>
          </template>

          <template v-else-if="m.type === 'TELEGRAM_JOIN'">
            <button type="button" class="btn outline full-width mb-2" @click="logVisit(m)">
              ✈️ 텔레그램 채널 입장하기
            </button>
            <div class="field">
              <label>본인의 텔레그램 핸들 (@username)</label>
              <div style="display: flex; gap: 0.5rem">
                <input v-model="telegramHandle[m.id]" type="text" placeholder="@nickname" style="flex: 1" />
                <button type="button" class="btn btn-sm" @click="verifyTelegram(m)">확인</button>
              </div>
            </div>
          </template>

          <template v-else-if="m.type === 'DISCORD_JOIN'">
            <button type="button" class="btn outline full-width mb-2" @click="logVisit(m)">
              👾 디스코드 서버 입장하기
            </button>
            <div v-if="!discordConnected[m.id]" class="center mt-2">
              <button type="button" class="btn btn-sm" @click="verifyDiscord(m)">연동 확인</button>
            </div>
            <p v-else class="center mt-2 success-msg">✅ 디스코드 연동됨</p>
          </template>

          <template v-else-if="m.type === 'YOUTUBE_WATCH'">
            <div :id="'yt-player-' + m.id" class="yt-container mb-3"></div>
            <div v-if="ytRemaining[m.id] > 0" class="timer-box">
              시청 중... ({{ ytRemaining[m.id] }}초 남음)
            </div>
            <div v-else class="timer-box success">
              ✅ 시청 완료! 미션을 제출해 주세요.
            </div>
          </template>

          <button
            v-if="camp.status === 'ACTIVE'"
            type="button"
            class="btn primary submit-btn"
            @click="submitMission(m)"
          >
            미션 완료 및 제출
          </button>
        </div>
      </div>
    </div>
    
    <!-- Participants List -->
    <div class="card participants-card">
      <div class="participants-header">
        <h2 class="section-title">{{ $t('detail.realtimeTitle') }}</h2>
        <span class="badge accent-badge">{{ $t('detail.totalParticipants', { count: participantCount }) }}</span>
      </div>
      
      <div v-if="participants.length > 0" class="participants-tags">
        <div v-for="(p, idx) in participants" :key="idx" class="p-tag">
          {{ p.email }}
        </div>
      </div>
      <div v-else class="empty-participants">
        <p>{{ $t('detail.nobodyParticipated') }}</p>
        <p class="hint">{{ $t('detail.beTheFirst') }}</p>
      </div>

      <p class="participant-notice">
        {{ $t('detail.participantNotice') }}
      </p>
    </div>
  </div>
  <p v-else-if="!err" class="loading-text">{{ $t('detail.loading') }}</p>
  <p v-else class="err-msg center">{{ err }}</p>
</template>

<style scoped>
.detail-container {
  padding-bottom: 5rem;
}

.detail-header {
  margin-bottom: 3.5rem;
  text-align: center;
}

.company-brand {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.company-logo {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  object-fit: cover;
  border: 1px solid var(--border);
}

.brand-name {
  font-weight: 800;
  font-size: 1.15rem;
  color: var(--text-h);
}

.description-text {
  margin: 0 auto 1.5rem;
  max-width: 40rem;
  line-height: 1.7;
  color: var(--text);
  font-size: 1.05rem;
}

.meta-row {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.meta-item {
  font-size: 0.9rem;
  color: var(--muted);
  font-weight: 600;
}

.accent-badge {
  background: var(--accent);
  color: white;
}

.copy-btn {
  padding: 0.45rem 1rem;
  font-size: 0.85rem;
  border-radius: 99px;
  height: auto;
  min-height: 36px;
}

.info-footer {
  margin-top: 1rem;
}

.reward-notice {
  font-size: 0.95rem;
  color: var(--muted);
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.period-text {
  font-size: 0.9rem;
  color: var(--muted);
  font-weight: 600;
}

/* Winners Card */
.winners-card {
  margin-bottom: 3rem;
  border-style: dashed;
  background: var(--accent-soft);
  padding: 2rem;
}

.section-title {
  font-size: 1.25rem;
  margin: 0 0 1rem;
  color: var(--text-h);
  font-weight: 800;
}

.winners-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}

.winner-row {
  font-weight: 700;
  font-size: 1rem;
}

.winner-points {
  color: var(--accent);
}

/* Mission Cards */
.mission-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.completed {
  border-color: var(--mint);
  background: color-mix(in srgb, var(--panel) 95%, var(--mint-soft));
}

.mission-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
}

.mission-type {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}

.type-icon {
  font-size: 1.75rem;
}

.point-badge {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 0.25rem 0.75rem;
  border-radius: 99px;
}

.badge-done {
  background: var(--mint);
  color: white;
}

.mission-title {
  font-size: 1.3rem;
  margin: 0 0 0.75rem;
  color: var(--text-h);
  font-weight: 800;
}

.mission-desc {
  margin: 0 0 1.5rem;
  font-size: 0.95rem;
  color: var(--text);
  line-height: 1.6;
}

.mission-body {
  border-top: 1px solid var(--border);
  padding-top: 1.5rem;
  margin-top: auto;
}

/* Specific Mission Types */
.survey-note {
  font-size: 0.9rem;
  color: var(--muted);
  margin-bottom: 1.5rem;
  border-left: 4px solid var(--accent);
  padding-left: 1rem;
  line-height: 1.6;
}

.survey-list {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.question-text {
  margin: 0 0 0.85rem;
  font-weight: 800;
  color: var(--text-h);
  line-height: 1.5;
}

.survey-textarea {
  width: 100%;
  min-height: 100px;
  padding: 0.85rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border);
  background: var(--bg-deep);
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
  transition: background 0.2s;
}
.radio-label:hover { background: var(--accent-soft); }

.quiz-question {
  margin: 0 0 1rem;
  font-weight: 800;
  font-size: 1rem;
}

.quiz-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.6rem;
}

.check-label {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  cursor: pointer;
  font-weight: 600;
}

.submit-btn {
  margin-top: 2rem;
  width: 100%;
  height: 3.5rem;
  font-size: 1.1rem;
  border-radius: 14px;
}

/* Participants List */
.participants-card {
  margin-top: 4rem;
  background: var(--bg-deep);
  border: 1px solid var(--border);
  padding: 2.5rem;
}

.participants-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.participants-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.p-tag {
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.5rem 1rem;
  background: var(--panel);
  border-radius: 0.75rem;
  border: 1px solid var(--border);
  color: var(--muted);
}

.empty-participants {
  padding: 3rem;
  text-align: center;
  color: var(--muted);
  background: var(--panel);
  border-radius: 1.25rem;
  border: 1px dashed var(--border);
}

.hint {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  opacity: 0.8;
}

.participant-notice {
  margin-top: 1.5rem;
  font-size: 0.85rem;
  color: var(--muted);
  text-align: center;
  font-weight: 600;
}

.full-width { width: 100%; }
.mt-3 { margin-top: 1rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 1rem; }
.center { text-align: center; }

.yt-container {
  aspect-ratio: 16/9;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
}

.timer-box {
  padding: 0.75rem;
  background: var(--bg-deep);
  border-radius: 8px;
  text-align: center;
  font-weight: 700;
  font-size: 0.9rem;
  margin-top: 0.75rem;
}

.timer-box.success {
  background: var(--mint-soft);
  color: var(--mint);
}

@media (max-width: 768px) {
  .meta-row { flex-direction: column; align-items: stretch; }
  .copy-btn { width: 100%; height: 44px; }
  .winners-grid { grid-template-columns: 1fr; }
  .participants-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
}
</style>
