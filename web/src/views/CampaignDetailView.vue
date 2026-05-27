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
  rewardCurrency: string
  rewardsConfig: string
  startsAt: string | null
  endsAt: string | null
  missions: Mission[]
  mySubmissions?: { missionId: string; status: string }[]
}

type Participant = { email: string; nickname?: string }
type WinnerRow = { rank: number; points: number; currency: string; rewardsConfig: string; user: { email: string } }

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
  TELEGRAM_CHANNEL: '📢',
  TELEGRAM_GROUP: '👥',
  DISCORD_JOIN: '👾',
  YOUTUBE_WATCH: '📺',
  YOUTUBE_SUBSCRIBE: '🔴',
  YOUTUBE_LIKE: '👍',
  INSTAGRAM_FOLLOW: '📸',
  INSTAGRAM_LIKE: '❤️'
}

function parseCfg(raw: string) {
  try {
    return JSON.parse(raw || '{}') as Record<string, any>
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
const isVerifying = ref<Record<string, boolean>>({})
const verifyStatus = ref<Record<string, { ok: boolean; msg: string }>>({})

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
    const p = await api.get<{ count: number; participants: Participant[] }>(`/campaigns/${id}/participants?t=${Date.now()}`)
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

function extractYoutubeId(urlOrId: string): string {
  if (!urlOrId) return ''
  const clean = urlOrId.trim()
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/
  const match = clean.match(regExp)
  return (match && match[2].length === 11) ? match[2] : clean
}

function initYoutubePlayers() {
  if (!camp.value) return
  const youtubeMissions = camp.value.missions.filter(m => m.type === 'YOUTUBE_WATCH')
  if (youtubeMissions.length === 0) return

  const setupPlayers = () => {
    youtubeMissions.forEach(m => {
      const cfg = parseCfg(m.config)
      const targetSec = Number(cfg.targetSeconds || 10)
      ytRemaining.value[m.id] = targetSec
      
      const vId = extractYoutubeId(cfg.videoId || '')
      if (!vId) return

      new (window as any).YT.Player(`yt-player-${m.id}`, {
        height: '240',
        width: '100%',
        videoId: vId,
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

  if ((window as any).YT && (window as any).YT.Player) {
    setupPlayers()
  } else {
    const prevCallback = (window as any).onYouTubeIframeAPIReady
    ;(window as any).onYouTubeIframeAPIReady = () => {
      if (prevCallback) prevCallback()
      setupPlayers()
    }

    if (!(window as any).YT) {
      const tag = document.createElement('script')
      tag.src = "https://www.youtube.com/iframe_api"
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
    }
  }
}

function startTimer(mid: string) {
  if (ytTimer.value[mid]) return
  ytTimer.value[mid] = setInterval(async () => {
    if (ytRemaining.value[mid] > 0) {
      ytRemaining.value[mid]--
      if (ytRemaining.value[mid] === 0) {
        stopTimer(mid)
        try {
          await api.post(`/missions/${mid}/event`, { name: 'youtube_watch_complete', meta: { watched: true } })
        } catch {
          /* ignore */
        }
      }
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

async function handleSNSMission(m: Mission) {
  if (!auth.token) {
    err.value = t('common.loginRequired')
    return
  }

  const cfg = parseCfg(m.config)
  const url = cfg.linkUrl || ''
  
  if (m.type === 'YOUTUBE_SUBSCRIBE') {
    if (!auth.user?.youtubeHandle) {
      alert(t('detail.snsLinkRequired', { type: 'YouTube' }))
      return
    }
    if (url) window.open(url, '_blank')
    await verifySNS(m, '/verify/youtube/subscribe', { channelId: cfg.channelId || cfg.youtubeChannelId })
  } else if (m.type === 'YOUTUBE_LIKE') {
    if (!auth.user?.youtubeHandle) {
      alert(t('detail.snsLinkRequired', { type: 'YouTube' }))
      return
    }
    if (url) window.open(url, '_blank')
    await verifySNS(m, '/verify/youtube/like', { videoId: cfg.videoId || cfg.youtubeVideoId })
  } else if (m.type === 'TELEGRAM_JOIN' || m.type === 'TELEGRAM_CHANNEL' || m.type === 'TELEGRAM_GROUP') {
    if (!auth.user?.telegramHandle) {
      alert(t('detail.snsLinkRequired', { type: 'Telegram' }))
      return
    }
    if (url) window.open(url, '_blank')
    await verifySNS(m, '/verify/telegram', { missionId: m.id })
  } else if (m.type === 'DISCORD_JOIN') {
    if (!auth.user?.discordHandle) {
      alert(t('detail.snsLinkRequired', { type: 'Discord' }))
      return
    }
    if (url) window.open(url, '_blank')
    await verifySNS(m, '/verify/discord', { missionId: m.id })
  } else if (m.type === 'INSTAGRAM_FOLLOW' || m.type === 'INSTAGRAM_LIKE') {
    // Instagram is mostly manual or link-visit based for now
    if (url) window.open(url, '_blank')
    try {
      await api.post(`/missions/${m.id}/event`, { name: 'link_click', meta: { url } })
    } catch {
      /* ignore */
    }
    verifyStatus.value[m.id] = { ok: true, msg: t('common.visitCompleted') }
  } else {
    if (url) window.open(url, '_blank')
  }
}

async function verifySNS(m: Mission, endpoint: string, body: any) {
  isVerifying.value[m.id] = true
  verifyStatus.value[m.id] = { ok: false, msg: '' }
  try {
    const { data } = await api.post(endpoint, body)
    verifyStatus.value[m.id] = { ok: true, msg: data.message || t('detail.verifySuccess') }
  } catch (e: any) {
    const reason = e.response?.data?.error || t('common.errorLoad')
    verifyStatus.value[m.id] = { ok: false, msg: reason }
  } finally {
    isVerifying.value[m.id] = false
  }
}

async function logVisit(m: Mission) {
  if (!auth.token) {
    err.value = t('common.loginRequired')
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
    err.value = t('common.loginRequired')
    alert(t('common.loginRequired'))
    return
  }

  // SNS Verification check
  if (['YOUTUBE_SUBSCRIBE', 'YOUTUBE_LIKE', 'TELEGRAM_JOIN', 'TELEGRAM_CHANNEL', 'TELEGRAM_GROUP', 'DISCORD_JOIN'].includes(m.type)) {
    if (!verifyStatus.value[m.id]?.ok) {
      isVerifying.value[m.id] = true
      verifyStatus.value[m.id] = { ok: false, msg: '' }
      
      const cfg = parseCfg(m.config)
      let endpoint = ''
      let body: any = {}
      
      if (m.type === 'YOUTUBE_SUBSCRIBE') {
        if (!auth.user?.youtubeHandle) {
          alert(t('detail.snsLinkRequired', { type: 'YouTube' }))
          isVerifying.value[m.id] = false
          return
        }
        endpoint = '/verify/youtube/subscribe'
        body = { channelId: cfg.channelId || cfg.youtubeChannelId }
      } else if (m.type === 'YOUTUBE_LIKE') {
        if (!auth.user?.youtubeHandle) {
          alert(t('detail.snsLinkRequired', { type: 'YouTube' }))
          isVerifying.value[m.id] = false
          return
        }
        endpoint = '/verify/youtube/like'
        body = { videoId: cfg.videoId || cfg.youtubeVideoId }
      } else if (m.type === 'TELEGRAM_JOIN' || m.type === 'TELEGRAM_CHANNEL' || m.type === 'TELEGRAM_GROUP') {
        if (!auth.user?.telegramHandle) {
          alert(t('detail.snsLinkRequired', { type: 'Telegram' }))
          isVerifying.value[m.id] = false
          return
        }
        endpoint = '/verify/telegram'
        body = { missionId: m.id }
      } else if (m.type === 'DISCORD_JOIN') {
        if (!auth.user?.discordHandle) {
          alert(t('detail.snsLinkRequired', { type: 'Discord' }))
          isVerifying.value[m.id] = false
          return
        }
        endpoint = '/verify/discord'
        body = { missionId: m.id }
      }
      
      try {
        if (m.type.startsWith('YOUTUBE_')) {
          console.log("youtube verify payload", {
            campaignId: camp.value?.id,
            missionId: m.id,
            videoId: body.videoId,
            channelId: body.channelId,
            accessToken: auth.token,
          });
        }
        const { data } = await api.post(endpoint, body)
        verifyStatus.value[m.id] = { ok: true, msg: data.message || t('detail.verifySuccess') }
      } catch (e: any) {
        const reason = e.response?.data?.error || t('common.errorLoad')
        verifyStatus.value[m.id] = { ok: false, msg: reason }
        alert(t('detail.verifyFail', { reason }))
        isVerifying.value[m.id] = false
        return
      } finally {
        isVerifying.value[m.id] = false
      }
    }
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
      alert(t('common.checkRequired'))
      return
    }
    payload = {}
  } else if (m.type === 'FILE_UPLOAD') {
    payload = { fileUrl: codeInput.value[m.id] ?? '' }
  } else if (m.type.startsWith('TELEGRAM_')) {
    payload = { handle: auth.user?.telegramHandle }
  } else if (m.type === 'DISCORD_JOIN') {
    payload = { handle: auth.user?.discordHandle }
  } else if (m.type === 'YOUTUBE_WATCH') {
    if (ytRemaining.value[m.id] > 0) {
      err.value = t('detail.ytWatchRequired')
      alert(t('detail.ytWatchRequired'))
      return
    }
    payload = { watched: true }
  } else if (m.type.startsWith('YOUTUBE_')) {
    payload = { verified: true }
  } else if (m.type.startsWith('INSTAGRAM_')) {
    payload = { visited: true }
  }

  try {
    await api.post(`/missions/${m.id}/submit`, { payload })
    msg.value = t('common.submitSuccess')
    alert(t('common.submitSuccess'))
    const { data } = await api.get<CampaignDetail>(`/campaigns/${route.params.id}`)
    camp.value = data
    await loadParticipants()
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { error?: string } } }
    err.value = ax.response?.data?.error ?? t('common.submitFail')
    alert(err.value)
    if (m.type === 'QUIZ') {
      alert('다시 생각해 보세요')
    }
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
      <div class="description-text ql-editor" v-html="camp.description"></div>
      
      <div class="meta-row">
        <span class="badge">{{ $t('detail.statusLabel', { status: $t('campaign.status' + camp.status.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join('')) }) }}</span>
        <span v-if="camp.missions" class="meta-item">{{ $t('detail.missionsCountLabel', { count: camp.missions.length }) }}</span>
        <div v-if="camp.rewardsConfig && camp.rewardsConfig !== '[]'" class="detail-reward-badges">
            <div v-for="(r, idx) in JSON.parse(camp.rewardsConfig)" :key="idx" class="reward-chip" :class="r.currency.toLowerCase()">
              <span class="reward-icon">{{ r.currency === 'POINT' ? '🪙' : r.currency === 'USDT' ? '💵' : r.currency === 'METAQ' ? '💎' : '🎁' }}</span>
              <span class="reward-amount">{{ r.currency === 'OTHER' ? (r.amount.toLocaleString() + '개 (' + (r.customCurrency || $t('common.otherReward')) + ')') : (r.amount.toLocaleString() + (r.currency === 'POINT' ? 'P' : ' ' + r.currency)) }}</span>
            </div>
        </div>
        <span v-else-if="camp.totalRewardPoints > 0" class="badge accent-badge">
          {{ camp.totalRewardPoints.toLocaleString() }}{{ camp.rewardCurrency === 'POINT' ? 'P' : ' ' + camp.rewardCurrency }}
        </span>
        <button type="button" class="btn copy-btn" @click="copyLink">
          🔗 {{ showCopyMsg ? $t('detail.copied') : $t('detail.copyLink') }}
        </button>
      </div>

      <div class="info-footer">
        <p v-if="camp.totalRewardPoints > 0 || (camp.rewardsConfig && camp.rewardsConfig !== '[]')" class="reward-notice">
          {{ $t('campaign.rewardPerPersonPrefix') || 'Each' }}
          <template v-if="camp.rewardsConfig && camp.rewardsConfig !== '[]'">
            <span v-for="(r, idx) in JSON.parse(camp.rewardsConfig)" :key="idx" class="per-person-item">
              {{ Number(idx) > 0 ? ' + ' : '' }}{{ r.currency === 'OTHER' ? (Math.floor(r.amount / camp.winnerCount).toLocaleString() + '개 (' + (r.customCurrency || $t('common.otherReward')) + ')') : (Math.floor(r.amount / camp.winnerCount).toLocaleString() + (r.currency === 'POINT' ? 'P' : ' ' + r.currency)) }}
            </span>
          </template>
          <template v-else>
            {{ Math.floor(camp.totalRewardPoints / camp.winnerCount).toLocaleString() }}{{ camp.rewardCurrency === 'POINT' ? 'P' : ' ' + camp.rewardCurrency }}
          </template>
        </p>
        <p v-if="camp.rewardsConfig && camp.rewardsConfig !== '[]' && JSON.parse(camp.rewardsConfig).some((r: any) => r.currency !== 'POINT')" class="manual-notice">
          * {{ $t('campaign.manualPaymentNotice') }}
        </p>
        <p v-else-if="camp.rewardCurrency !== 'POINT' && camp.totalRewardPoints > 0" class="manual-notice">
          * {{ $t('campaign.manualPaymentNotice') }}
        </p>
        <div v-if="camp.startsAt || camp.endsAt" class="period-text">
          {{ $t('detail.period', {
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
          <span class="winner-points">
            (
            <template v-if="w.rewardsConfig && w.rewardsConfig !== '[]'">
              <span v-for="(r, idx) in JSON.parse(w.rewardsConfig)" :key="idx">
                {{ Number(idx) > 0 ? ' + ' : '' }}{{ r.currency === 'OTHER' ? (r.amount.toLocaleString() + '개 (' + (r.customCurrency || $t('common.otherReward')) + ')') : (r.amount.toLocaleString() + (r.currency === 'POINT' ? 'P' : ' ' + r.currency)) }}
              </span>
            </template>
            <template v-else-if="w.points > 0">
              {{ w.points.toLocaleString() }}{{ (w.currency || camp.rewardCurrency) === 'POINT' ? 'P' : ' ' + (w.currency || camp.rewardCurrency) }}
            </template>
            )
          </span>
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
                    :placeholder="$t('detail.answerPlaceholder')"
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
            
            <button v-if="parseCfg(m.config).linkUrl" type="button" class="btn btn-sm full-width" @click="logVisit(m)">{{ $t('detail.extraLinkOpen') }}</button>
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

          <template v-else-if="m.type === 'TELEGRAM_JOIN' || m.type === 'TELEGRAM_CHANNEL' || m.type === 'TELEGRAM_GROUP'">
            <div class="sns-mission-box">
              <button type="button" class="btn outline full-width mb-2" :disabled="isVerifying[m.id]" @click="handleSNSMission(m)">
                {{ isVerifying[m.id] ? $t('detail.verifying') : $t('detail.tgJoinBtn') }}
              </button>
              <div v-if="verifyStatus[m.id]" class="verify-alert" :class="{ success: verifyStatus[m.id].ok, error: !verifyStatus[m.id].ok }">
                {{ verifyStatus[m.id].ok ? verifyStatus[m.id].msg : $t('detail.verifyFail', { reason: verifyStatus[m.id].msg }) }}
              </div>
              <div v-if="auth.user?.telegramHandle" class="linked-info">
                {{ $t('detail.linkedAccount', { handle: auth.user.telegramHandle }) }}
              </div>
              <div v-else class="link-notice">
                {{ $t('detail.snsNotLinked', { type: 'Telegram' }) }} <RouterLink to="/my-page">{{ $t('nav.myPage') }}</RouterLink>
              </div>
            </div>
          </template>

          <template v-else-if="m.type === 'DISCORD_JOIN'">
            <div class="sns-mission-box">
              <button type="button" class="btn outline full-width mb-2" :disabled="isVerifying[m.id]" @click="handleSNSMission(m)">
                {{ isVerifying[m.id] ? $t('detail.verifying') : $t('detail.discordJoinBtn') }}
              </button>
              <div v-if="verifyStatus[m.id]" class="verify-alert" :class="{ success: verifyStatus[m.id].ok, error: !verifyStatus[m.id].ok }">
                {{ verifyStatus[m.id].ok ? verifyStatus[m.id].msg : $t('detail.verifyFail', { reason: verifyStatus[m.id].msg }) }}
              </div>
              <div v-if="auth.user?.discordHandle" class="linked-info">
                {{ $t('detail.linkedAccount', { handle: auth.user.discordHandle }) }}
              </div>
              <div v-else class="link-notice">
                {{ $t('detail.snsNotLinked', { type: 'Discord' }) }} <RouterLink to="/my-page">{{ $t('nav.myPage') }}</RouterLink>
              </div>
            </div>
          </template>

          <template v-else-if="m.type === 'YOUTUBE_WATCH'">
            <div :id="'yt-player-' + m.id" class="yt-container mb-3"></div>
            <!-- Watch on YouTube Button -->
            <a 
              v-if="parseCfg(m.config).linkUrl || parseCfg(m.config).videoId" 
              :href="parseCfg(m.config).linkUrl || ('https://youtube.com/watch?v=' + extractYoutubeId(parseCfg(m.config).videoId))" 
              target="_blank" 
              class="btn outline full-width mb-3 text-center d-flex align-items-center justify-content-center"
              style="text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 0.5rem; height: 3.5rem; font-size: 1.1rem; border-radius: 14px; margin-bottom: 1rem;"
            >
              📺 {{ $t('detail.ytWatchOnYoutube') }}
            </a>
            <div v-if="ytRemaining[m.id] > 0" class="timer-box">
              {{ $t('detail.ytWatching', { n: ytRemaining[m.id] }) }}
            </div>
            <div v-else class="timer-box success">
              {{ $t('detail.ytWatchComplete') }}
            </div>
          </template>

          <template v-else-if="m.type === 'YOUTUBE_SUBSCRIBE'">
            <div class="sns-mission-box">
              <button type="button" class="btn outline full-width mb-2" :disabled="isVerifying[m.id]" @click="handleSNSMission(m)">
                {{ isVerifying[m.id] ? $t('detail.verifying') : $t('detail.ytSubscribeBtn') }}
              </button>
              <div v-if="verifyStatus[m.id]" class="verify-alert" :class="{ success: verifyStatus[m.id].ok, error: !verifyStatus[m.id].ok }">
                {{ verifyStatus[m.id].ok ? verifyStatus[m.id].msg : $t('detail.verifyFail', { reason: verifyStatus[m.id].msg }) }}
              </div>
              <div v-if="auth.user?.youtubeHandle" class="linked-info">
                {{ $t('detail.linkedAccount', { handle: auth.user.youtubeHandle }) }}
              </div>
              <div v-else class="link-notice">
                {{ $t('detail.snsNotLinked', { type: 'YouTube' }) }} <RouterLink to="/my-page">{{ $t('nav.myPage') }}</RouterLink>
              </div>
            </div>
          </template>

          <template v-else-if="m.type === 'YOUTUBE_LIKE'">
            <div class="sns-mission-box">
              <button type="button" class="btn outline full-width mb-2" :disabled="isVerifying[m.id]" @click="handleSNSMission(m)">
                {{ isVerifying[m.id] ? $t('detail.verifying') : $t('detail.ytLikeBtn') }}
              </button>
              <div v-if="verifyStatus[m.id]" class="verify-alert" :class="{ success: verifyStatus[m.id].ok, error: !verifyStatus[m.id].ok }">
                {{ verifyStatus[m.id].ok ? verifyStatus[m.id].msg : $t('detail.verifyFail', { reason: verifyStatus[m.id].msg }) }}
              </div>
              <div v-if="auth.user?.youtubeHandle" class="linked-info">
                {{ $t('detail.linkedAccount', { handle: auth.user.youtubeHandle }) }}
              </div>
              <div v-else class="link-notice">
                {{ $t('detail.snsNotLinked', { type: 'YouTube' }) }} <RouterLink to="/my-page">{{ $t('nav.myPage') }}</RouterLink>
              </div>
            </div>
          </template>

          <template v-else-if="m.type === 'INSTAGRAM_FOLLOW'">
            <div class="sns-mission-box">
              <button type="button" class="btn outline full-width mb-2" @click="handleSNSMission(m)">
                {{ $t('detail.igFollowBtn') }}
              </button>
              <div v-if="verifyStatus[m.id]" class="verify-alert success">
                {{ verifyStatus[m.id].msg }}
              </div>
            </div>
          </template>

          <template v-else-if="m.type === 'INSTAGRAM_LIKE'">
            <div class="sns-mission-box">
              <button type="button" class="btn outline full-width mb-2" @click="handleSNSMission(m)">
                {{ $t('detail.igLikeBtn') }}
              </button>
              <div v-if="verifyStatus[m.id]" class="verify-alert success">
                {{ verifyStatus[m.id].msg }}
              </div>
            </div>
          </template>

          <button
            v-if="camp.status === 'ACTIVE'"
            type="button"
            class="btn primary submit-btn"
            :disabled="myStatus(m.id) === 'APPROVED'"
            @click="submitMission(m)"
          >
            {{ $t('detail.submitMission') }}
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
          {{ p.nickname || p.email }}
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

.detail-reward-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.reward-chip {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.75rem;
  border-radius: 0.75rem;
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 800;
  font-size: 1rem;
  border: 1px solid var(--accent-border);
  white-space: normal;
  word-break: keep-all;
}

.reward-chip.usdt { background: #e6fffa; color: #008a76; border-color: #b2f5ea; }
.reward-chip.metaq { background: #fff5f7; color: #d53f8c; border-color: #fed7e2; }
.reward-chip.point { background: var(--accent-soft); color: var(--accent); border-color: var(--accent-border); }
.reward-chip.other { background: #f0f4f8; color: #475569; border-color: #cbd5e1; }

.per-person-item {
  color: var(--accent);
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
  line-height: 1.3;
  overflow-wrap: break-word;
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

.submit-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  pointer-events: none;
  background: var(--muted) !important;
  border-color: var(--border) !important;
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
  max-height: 120px;
  overflow-y: auto;
  padding-right: 0.5rem;
}
.participants-tags::-webkit-scrollbar {
  width: 4px;
}
.participants-tags::-webkit-scrollbar-track {
  background: transparent;
}
.participants-tags::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 10px;
}
.participants-tags::-webkit-scrollbar-thumb:hover {
  background: var(--muted);
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
.manual-notice {
  font-size: 0.85rem;
  color: var(--accent);
  font-weight: 700;
  margin-top: 0.25rem;
  margin-bottom: 0.75rem;
}

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
  .detail-header { margin-bottom: 2rem; }
  .meta-row { flex-direction: column; align-items: stretch; gap: 0.8rem; }
  .detail-reward-badges { justify-content: stretch; }
  .detail-reward-badges .reward-chip { justify-content: center; }
  .copy-btn { width: 100%; height: 44px; margin-top: 0.5rem; }
  .winners-grid { grid-template-columns: 1fr; }
  .participants-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
  .mission-card { padding: 1.25rem; }
  .mission-title { font-size: 1.15rem; }
  .type-icon { font-size: 1.5rem; }
  .participants-card { padding: 1.5rem; margin-top: 2rem; }
}

@media (max-width: 480px) {
  .description-text { font-size: 0.95rem; }
  .reward-notice { font-size: 0.85rem; }
}
.sns-mission-box {
  background: var(--bg-deep);
  padding: 1.25rem;
  border-radius: 1rem;
  margin-bottom: 1rem;
  border: 1px solid var(--border);
}

.verify-alert {
  padding: 0.75rem;
  border-radius: 0.75rem;
  font-size: 0.9rem;
  font-weight: 700;
  margin-bottom: 1rem;
  text-align: center;
}

.verify-alert.success {
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.verify-alert.error {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.linked-info {
  font-size: 0.85rem;
  color: var(--muted);
  text-align: center;
  font-weight: 600;
}

.link-notice {
  font-size: 0.85rem;
  color: #991b1b;
  text-align: center;
  font-weight: 600;
}

.link-notice a {
  color: var(--accent);
  text-decoration: underline;
}
</style>
