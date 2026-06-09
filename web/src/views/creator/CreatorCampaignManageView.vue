<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { api, getFileUrl } from '../../api/client'
import { uploadCompanyLogo } from '../../api/upload'
import * as XLSX from 'xlsx'
import MissionListEditor from '../../components/ops/MissionListEditor.vue'
import RichEditor from '../../components/common/RichEditor.vue'
import {
  apiMissionToRow,
  emptyMissionRow,
  rowToPayload,
  validateRows,
  type MissionRowState,
} from '../../utils/missionRow'

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
  creatorId: string
  lotteryMode: string
  winnerCount: number
  rewardDistMode?: string
  totalRewardPoints: number
  rewardCurrency: string
  rewardsConfig: string
  autoApprove: boolean
  startsAt: string | null
  endsAt: string | null
  drawAt: string | null
  missions: Mission[]
}

type SubRow = {
  id: string
  status: string
  payload: string
  createdAt: string
  missionId: string
  user: { 
    email: string;
    nickname?: string;
    walletAddress?: string;
    telegramHandle?: string;
    discordHandle?: string;
    youtubeHandle?: string;
    instagramHandle?: string;
  }
  mission: { title: string; type: string; config: string }
}

type CampaignStats = {
  campaignId: string
  missions: number
  submissions: { total: number; approved: number; pending: number; rejected: number }
  winners: number
  byMission: { missionId: string; title: string; approved: number; pending: number; rejected: number }[]
}



type TabId = 'compose' | 'stats' | 'participants' | 'winners' | 'submissions'

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

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const stats = ref<CampaignStats | null>(null)
const camp = ref<CampaignDetail | null>(null)
const participants = ref<{ email: string; completed: number; status: string }[]>([])
const winnersList = ref<{ email: string }[]>([])
const submissionsList = ref<SubRow[]>([])
const subLoading = ref(false)
const subFilter = ref<'SURVEY' | 'FILE_UPLOAD'>('SURVEY')
const filteredSubmissions = computed(() => {
  return submissionsList.value.filter(s => s.mission.type === subFilter.value)
})
const err = ref('')
const tab = ref<TabId>('compose')
const saving = ref(false)
const logoUploading = ref(false)
const logoFileInput = ref<HTMLInputElement | null>(null)

async function loadSubmissions() {
  const id = route.params.id as string
  subLoading.value = true
  try {
    const { data } = await api.get<SubRow[]>(`/campaigns/${id}/submissions`)
    submissionsList.value = data
  } catch (e) {
    console.error("Failed to load submissions", e)
    err.value = t('common.errorLoad')
  } finally {
    subLoading.value = false
  }
}

async function updateSubmissionStatus(subId: string, nextStatus: 'APPROVED' | 'REJECTED') {
  err.value = ''
  try {
    await api.patch(`/submissions/${subId}`, { status: nextStatus })
    const found = submissionsList.value.find(s => s.id === subId)
    if (found) {
      found.status = nextStatus
    }
  } catch (e: unknown) {
    console.error("Failed to update submission status", e)
    const ax = e as { response?: { data?: { error?: string } } }
    err.value = ax.response?.data?.error || t('ops.saveFail')
  }
}

function parseSurveyPayload(s: SubRow): { question: string; answer: string }[] {
  try {
    const p = JSON.parse(s.payload || '{}')
    const c = JSON.parse(s.mission.config || '{}')
    if (p.answers && c.surveyQuestions) {
      return c.surveyQuestions.map((q: any) => {
        const ans = p.answers[q.id]
        let displayAns = ans ?? t('common.notAnswered')
        if (q.type === 'OBJECTIVE' && ans !== undefined) {
          displayAns = q.options?.[ans] ?? ans
        }
        return {
          question: q.question,
          answer: String(displayAns)
        }
      })
    }
    const legacyAns = p.code || p.note || t('common.submitted')
    return [{ question: '설문 응답', answer: String(legacyAns) }]
  } catch {
    return [{ question: '에러', answer: t('common.parseError') }]
  }
}

function getFileUrlFromPayload(s: SubRow): string {
  try {
    const p = JSON.parse(s.payload || '{}')
    return p.fileUrl || ''
  } catch {
    return ''
  }
}

function isImageFile(url: string): boolean {
  if (!url) return false
  const ext = url.split('.').pop()?.toLowerCase() || ''
  return ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)
}

const isDraftLike = computed(
  () => !!camp.value && (camp.value.status === 'DRAFT' || camp.value.status === 'PENDING_ADMIN')
)

const isEditable = computed(
  () => auth.user?.role === 'ADMIN' || (isDraftLike.value && auth.user?.role !== 'MANAGER')
)

const draftCompanyName = ref('')
const draftCompanyLogo = ref('')
const draftTitle = ref('')
const draftDescription = ref('')
const draftWinnerCount = ref(1)
const draftRewardDistMode = ref<'COMBINED' | 'SEPARATE'>('COMBINED')
const draftLotteryMode = ref<'SIMPLE' | 'WEIGHTED'>('SIMPLE')
const draftAutoApprove = ref(true)
const draftRewards = ref<{ amount: number; currency: string; customCurrency?: string; winnerCount?: number }[]>([{ amount: 0, currency: 'POINT', winnerCount: 1 }])
const draftStartsAt = ref('')
const draftEndsAt = ref('')
const draftDrawAt = ref('')
const missionRows = ref<MissionRowState[]>([emptyMissionRow(0)])





function syncDraftFromCamp() {
  const c = camp.value
  if (!c) return
  draftCompanyName.value = c.companyName ?? ''
  draftCompanyLogo.value = c.companyLogoUrl ?? ''
  draftTitle.value = c.title
  draftDescription.value = c.description ?? ''
  draftWinnerCount.value = c.winnerCount
  draftRewardDistMode.value = (c.rewardDistMode as 'COMBINED' | 'SEPARATE') || 'COMBINED'
  draftLotteryMode.value = (c.lotteryMode as 'SIMPLE' | 'WEIGHTED') || 'SIMPLE'
  draftAutoApprove.value = c.autoApprove ?? true
  try {
    const parsed = JSON.parse(c.rewardsConfig || "[]")
    draftRewards.value = parsed.map((r: any) => ({ ...r, winnerCount: r.winnerCount || 1 }))
    if (draftRewards.value.length === 0) {
      draftRewards.value = [{ amount: c.totalRewardPoints ?? 0, currency: c.rewardCurrency ?? 'POINT', winnerCount: 1 }]
    }
  } catch (e) {
    draftRewards.value = [{ amount: c.totalRewardPoints ?? 0, currency: c.rewardCurrency ?? 'POINT', winnerCount: 1 }]
  }
  draftStartsAt.value = c.startsAt ? toLocalInput(c.startsAt) : ''
  draftEndsAt.value = c.endsAt ? toLocalInput(c.endsAt) : ''
  draftDrawAt.value = c.drawAt ? toLocalInput(c.drawAt) : ''
  missionRows.value =
    c.missions?.length ? c.missions.map((m) => apiMissionToRow(m)) : [emptyMissionRow(0)]
}

function toLocalInput(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const requiredBalancesDiff = computed(() => {
  const diffs = { POINT: 0, USDT: 0, BRL: 0, METAQ: 0, COUPON: 0 }
  if (!camp.value) return diffs

  let oldRewards: any[] = []
  try {
    oldRewards = JSON.parse(camp.value.rewardsConfig || "[]")
  } catch {
    oldRewards = []
  }

  const oldReqs = { POINT: 0, USDT: 0, BRL: 0, METAQ: 0, COUPON: 0 }
  for (const r of oldRewards) {
    const currency = r.currency
    const amount = Number(r.amount) || 0
    if (currency === 'POINT') oldReqs.POINT += Math.floor(amount)
    else if (currency === 'COUPON') oldReqs.COUPON += Math.floor(amount)
    else if (currency === 'USDT') oldReqs.USDT += amount
    else if (currency === 'BRL') oldReqs.BRL += amount
    else if (currency === 'METAQ') oldReqs.METAQ += amount
  }

  const newReqs = { POINT: 0, USDT: 0, BRL: 0, METAQ: 0, COUPON: 0 }
  for (const r of draftRewards.value) {
    const currency = r.currency
    const amount = Number(r.amount) || 0
    if (currency === 'POINT') newReqs.POINT += Math.floor(amount)
    else if (currency === 'COUPON') newReqs.COUPON += Math.floor(amount)
    else if (currency === 'USDT') newReqs.USDT += amount
    else if (currency === 'BRL') newReqs.BRL += amount
    else if (currency === 'METAQ') newReqs.METAQ += amount
  }

  diffs.POINT = newReqs.POINT - oldReqs.POINT
  diffs.COUPON = newReqs.COUPON - oldReqs.COUPON
  diffs.USDT = newReqs.USDT - oldReqs.USDT
  diffs.BRL = newReqs.BRL - oldReqs.BRL
  diffs.METAQ = newReqs.METAQ - oldReqs.METAQ

  return diffs
})

const balanceErrors = computed(() => {
  const errors: string[] = []
  if (!auth.user || !camp.value) return errors
  if (camp.value.creatorId !== auth.user.id) return errors

  const diff = requiredBalancesDiff.value
  const user = auth.user

  if (diff.POINT > 0 && diff.POINT > (user.pointBalance || 0)) {
    errors.push(`포인트 잔액이 부족합니다. (추가 필요: ${diff.POINT.toLocaleString()}P / 보유: ${(user.pointBalance || 0).toLocaleString()}P)`)
  }
  if (diff.COUPON > 0 && diff.COUPON > (user.couponBalance || 0)) {
    errors.push(`티켓 잔액이 부족합니다. (추가 필요: ${diff.COUPON.toLocaleString()}장 / 보유: ${(user.couponBalance || 0).toLocaleString()}장)`)
  }
  if (diff.USDT > 0 && diff.USDT > (user.usdtBalance || 0)) {
    errors.push(`USDT 잔액이 부족합니다. (추가 필요: ${diff.USDT.toLocaleString()} / 보유: ${(user.usdtBalance || 0).toLocaleString()})`)
  }
  if (diff.BRL > 0 && diff.BRL > (user.brlBalance || 0)) {
    errors.push(`BRL 잔액이 부족합니다. (추가 필요: ${diff.BRL.toLocaleString()} / 보유: ${(user.brlBalance || 0).toLocaleString()})`)
  }
  if (diff.METAQ > 0 && diff.METAQ > (user.metaqBalance || 0)) {
    errors.push(`METAQ 잔액이 부족합니다. (추가 필요: ${diff.METAQ.toLocaleString()} / 보유: ${(user.metaqBalance || 0).toLocaleString()})`)
  }
  return errors
})

async function reload() {
  const id = route.params.id as string
  const { data } = await api.get<CampaignDetail>(`/campaigns/${id}`)
  camp.value = data
  syncDraftFromCamp()
  tab.value = 'compose'
}

async function loadStats() {
  const id = route.params.id as string
  const { data } = await api.get<CampaignStats>(`/campaigns/${id}/stats`)
  stats.value = data
}

async function loadParticipants() {
  const id = route.params.id as string
  const { data: allSubs } = await api.get<SubRow[]>(`/campaigns/${id}/submissions`)
  const missionCount = camp.value?.missions.length || 0
  const userMap = new Map<string, any>()
  
  allSubs.forEach(s => {
    if (!userMap.has(s.user.email)) {
      userMap.set(s.user.email, { 
        email: s.user.email, 
        wallet: s.user.walletAddress || '',
        telegram: s.user.telegramHandle || '',
        discord: s.user.discordHandle || '',
        youtube: s.user.youtubeHandle || '',
        instagram: s.user.instagramHandle || '',
        completed: 0, 
        status: '' 
      })
    }
    if (s.status === 'APPROVED') {
      userMap.get(s.user.email)!.completed++
    }
  })
  
  participants.value = [...userMap.values()].map(u => ({
    ...u,
    status: u.completed >= missionCount ? t('ops.completedLotteryTarget') : t('ops.incomplete')
  }))
}

async function loadWinners() {
  const id = route.params.id as string
  const { data } = await api.get<any[]>(`/campaigns/${id}/winners`) // Assuming this endpoint exists or will be used
  winnersList.value = data.map(w => ({ email: w.user.email }))
}

onMounted(async () => {
  try {
    await reload()
  } catch {
    err.value = t('common.errorLoad')
  }
})

async function onDraftLogoFile(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  err.value = ''
  logoUploading.value = true
  try {
    draftCompanyLogo.value = await uploadCompanyLogo(file)
  } catch {
    err.value = t('ops.logoUploadFail')
  } finally {
    logoUploading.value = false
    input.value = ''
  }
}

function clearDraftLogo() {
  draftCompanyLogo.value = ''
}

function checkWalletRequirement(_reward: { amount: number; currency: string; customCurrency?: string; winnerCount?: number }, _event: Event) {
  // MetaMask 연동 없이도 토큰 보상 설정 가능 (DB 잔액 기반)
  // 실제 지갑 연동은 출금 신청 시에만 필요
}

function addDraftReward() {
  draftRewards.value.push({ amount: 0, currency: 'POINT', winnerCount: 1 })
}

function removeDraftReward(index: number) {
  if (draftRewards.value.length > 1) {
    draftRewards.value.splice(index, 1)
  }
}

async function saveDraft() {
  err.value = ''
  

  // 매니저는 오직 제목과 설명만 패치하므로 미션 유효성 검사 불필요
  if (auth.user?.role !== 'MANAGER') {
    const v = validateRows(missionRows.value)
    if (v) {
      err.value = v
      return
    }
    if (draftStartsAt.value && draftEndsAt.value && new Date(draftEndsAt.value) < new Date(draftStartsAt.value)) {
      err.value = t('error.endsAtEarly') || 'Campaign end date cannot be earlier than startsAt'
      return
    }
    if (draftEndsAt.value && draftDrawAt.value && new Date(draftDrawAt.value) < new Date(draftEndsAt.value)) {
      err.value = t('error.drawAtEarly') || 'Draw date cannot be earlier than endsAt'
      return
    }
  }
  
  if (!draftTitle.value.trim()) {
    err.value = t('ops.titleRequired')
    return
  }
  if (balanceErrors.value.length > 0) {
    err.value = balanceErrors.value.join(' | ')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  const id = route.params.id as string
  saving.value = true
  try {
    const payload: any = {}
    if (auth.user?.role === 'MANAGER') {
      payload.title = draftTitle.value.trim()
      payload.description = draftDescription.value
    } else {
      const missions = missionRows.value.map((r, i) => rowToPayload(r, i))
      const finalWinnerCount = draftRewardDistMode.value === 'SEPARATE'
        ? draftRewards.value.reduce((sum, r) => sum + (r.winnerCount || 1), 0)
        : draftWinnerCount.value

      Object.assign(payload, {
        title: draftTitle.value.trim(),
        description: draftDescription.value,
        companyName: draftCompanyName.value.trim(),
        companyLogoUrl: draftCompanyLogo.value.trim(),
        winnerCount: finalWinnerCount,
        rewardDistMode: draftRewardDistMode.value,
        lotteryMode: draftLotteryMode.value,
        autoApprove: draftAutoApprove.value,
        totalRewardPoints: draftRewards.value[0]?.amount || 0,
        rewardCurrency: draftRewards.value[0]?.currency || "POINT",
        rewardsConfig: draftRewards.value,
        startsAt: draftStartsAt.value ? new Date(draftStartsAt.value).toISOString() : null,
        endsAt: draftEndsAt.value ? new Date(draftEndsAt.value).toISOString() : null,
        drawAt: draftDrawAt.value ? new Date(draftDrawAt.value).toISOString() : null,
        missions,
      })
    }

    await api.patch(`/campaigns/${id}`, payload)
    await reload()
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { error?: any } } }
    const resErr = ax.response?.data?.error
    if (typeof resErr === 'string') {
      err.value = resErr
    } else if (resErr && typeof resErr === 'object') {
      err.value = t('ops.saveFail') + ' (입력값을 다시 확인해 주세요)'
      console.error("Save Error:", resErr)
    } else {
      err.value = t('ops.saveFail')
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } finally {
    saving.value = false
  }
}

async function deleteCampaign() {
  if (!camp.value) return
  const confirmMsg = "⚠️ 경고: 캠페인을 삭제하면 해당 캠페인의 모든 미션, 참가 제출(submissions) 및 당첨자(winners) 데이터가 영구적으로 삭제되며 복구할 수 없습니다.\n\n정말로 이 캠페인을 삭제하시겠습니까?"
  if (!confirm(confirmMsg)) return

  saving.value = true
  err.value = ''
  try {
    await api.delete(`/campaigns/${camp.value.id}`)
    alert("캠페인이 성공적으로 삭제되었습니다.")
    router.push('/ops')
  } catch (e: unknown) {
    console.error("Failed to delete campaign:", e)
    const ax = e as { response?: { data?: { error?: string } } }
    alert(ax.response?.data?.error || "캠페인 삭제에 실패했습니다.")
  } finally {
    saving.value = false
  }
}


async function openTab(id: TabId) {
  tab.value = id
  if (id === 'participants') loadParticipants()
  if (id === 'winners') loadWinners()
  if (id === 'stats') loadStats()
  if (id === 'submissions') loadSubmissions()
}

function parsePayloadDetail(s: SubRow) {
  try {
    const p = JSON.parse(s.payload || '{}')
    const c = JSON.parse(s.mission.config || '{}')
    
    switch (s.mission.type) {
      case 'QUIZ': {
        const selected = p.selectedIndex !== undefined ? (c.quizOptions?.[p.selectedIndex] ?? `Index: ${p.selectedIndex}`) : t('common.notSelected')
        const isCorrect = p.selectedIndex === c.correctIndex
        return `[${t('ops.typeQuiz')}] ${selected} (${isCorrect ? t('common.correct') : t('common.incorrect')})`
      }
      case 'SURVEY': {
        // 다중 질문 답변 처리
        if (p.answers && c.surveyQuestions) {
          return c.surveyQuestions.map((q: any, i: number) => {
            const ans = p.answers[q.id]
            let displayAns = ans ?? t('common.notAnswered')
            if (q.type === 'OBJECTIVE' && ans !== undefined) {
              displayAns = q.options?.[ans] ?? ans
            }
            return `Q${i + 1}. ${q.question}: ${displayAns}`
          }).join(' | ')
        }
        // 레거시 또는 단일 응답 처리
        return p.code || p.note || t('common.submitted')
      }
      case 'CODE':
        return p.code || t('common.correctAnswerSubmitted')
      case 'LINK_VISIT':
        return p.dwellSeconds ? t('common.dwellSeconds', { n: p.dwellSeconds }) : t('common.visitCompleted')
      case 'FILE_UPLOAD':
        return p.fileUrl || t('common.fileUploaded')
      default:
        // 정의되지 않은 필드들도 최대한 보여줌
        const keys = Object.keys(p)
        if (keys.length > 0) {
          return keys.map(k => `${k}: ${p[k]}`).join(', ')
        }
        return t('common.completed')
    }
  } catch {
    return t('common.parseError')
  }
}

async function exportToExcel() {
  if (!camp.value) return
  err.value = ''
  
  try {
    // 엑셀을 뽑기 위해 최신 제출 정보를 가져옴
    const id = route.params.id as string
    const { data: allSubs } = await api.get<SubRow[]>(`/campaigns/${id}/submissions`)
    
    const workbook = XLSX.utils.book_new()
    
    // 1. 참여자 요약 시트
    const missionCount = camp.value.missions.length
    const userMap = new Map<string, any>()
    
    allSubs.forEach(s => {
      if (!userMap.has(s.user.email)) {
        userMap.set(s.user.email, { 
          email: s.user.email, 
          nickname: s.user.nickname || '',
          wallet: s.user.walletAddress || '',
          telegram: s.user.telegramHandle || '',
          discord: s.user.discordHandle || '',
          youtube: s.user.youtubeHandle || '',
          instagram: s.user.instagramHandle || '',
          completed: 0, 
          status: t('common.insufficient') 
        })
      }
      if (s.status === 'APPROVED') {
        userMap.get(s.user.email)!.completed++
      }
    })
    
    const summaryRows = [...userMap.values()].map(u => ({
      [t('auth.email')]: u.email,
      [t('mypage.nickname') || 'Nickname']: u.nickname,
      [t('mypage.walletAddress') || 'Wallet']: u.wallet,
      'Telegram': u.telegram,
      'Discord': u.discord,
      'YouTube': u.youtube,
      'Instagram': u.instagram,
      [t('ops.completedMissionCount')]: u.completed,
      [t('ops.totalMissionCount')]: missionCount,
      [t('ops.allMissionsCompleted')]: u.completed >= missionCount ? t('ops.completedLotteryTarget') : t('ops.incomplete')
    }))
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryRows)
    XLSX.utils.book_append_sheet(workbook, summarySheet, t('ops.participantSummary'))
    
    // 2. 미션별 시트 생성
    camp.value.missions.forEach(m => {
      const mSubs = allSubs.filter(s => s.missionId === m.id)
      const rows = mSubs.map(s => ({
        [t('auth.email')]: s.user.email,
        [t('mypage.nickname') || 'Nickname']: s.user.nickname || '',
        [t('mypage.walletAddress') || 'Wallet']: s.user.walletAddress || '',
        'Telegram': s.user.telegramHandle || '',
        'Discord': s.user.discordHandle || '',
        'YouTube': s.user.youtubeHandle || '',
        'Instagram': s.user.instagramHandle || '',
        [t('ops.statusLabel')]: s.status,
        [t('ops.answerContent')]: parsePayloadDetail(s),
        [t('ops.submitTime')]: new Date(s.createdAt).toLocaleString()
      }))
      
      const sheet = XLSX.utils.json_to_sheet(rows)
      // 시트명 금지 문자(\ / ? * : [ ]) 제거 및 길이 제한 (31자), 중복 방지
      const cleanTitle = m.title.replace(/[\\/?*:[\]]/g, '').slice(0, 20)
      let sheetName = `${cleanTitle}_${m.type.slice(0, 4)}`
      
      // 중복 시트명 처리
      let counter = 1
      while (workbook.SheetNames.includes(sheetName)) {
        sheetName = `${cleanTitle.slice(0, 17)}_${counter++}`
      }
      
      XLSX.utils.book_append_sheet(workbook, sheet, sheetName)
    })
    
    XLSX.writeFile(workbook, `Campaign_Export_${camp.value.id}.xlsx`)
  } catch (e) {
    console.error(e)
    err.value = t('ops.excelExportError')
  }
}

async function downloadCsv() {
  if (!camp.value) return
  err.value = ''
  try {
    const res = await api.get(`/campaigns/${camp.value.id}/export`, {
      responseType: 'blob'
    })
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `campaign_${camp.value.id}_data.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch {
    alert(t('ops.exportFail'))
  }
}
</script>

<template>
  <div v-if="camp">
    <div v-if="camp.companyLogoUrl || camp.companyName" style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem">
      <img
        v-if="camp.companyLogoUrl"
        :src="getFileUrl(camp.companyLogoUrl)"
        alt=""
        style="width: 44px; height: 44px; border-radius: 10px; object-fit: cover; border: 1px solid var(--border)"
      />
      <span v-if="camp.companyName" style="font-weight: 800; color: var(--text-h)">{{ camp.companyName }}</span>
    </div>
    
    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem">
      <h1 class="page-title" style="margin-bottom: 0">{{ camp.title }}</h1>
      <div style="display: flex; gap: 0.5rem">
        <button v-if="!isDraftLike" type="button" class="btn outline" @click="downloadCsv">
          📥 CSV
        </button>
        <button v-if="!isDraftLike" type="button" class="btn primary" @click="exportToExcel">
          📊 {{ $t('ops.exportExcel') }}
        </button>
      </div>
    </div>
    <p style="color: var(--muted); margin-bottom: 0.75rem">
      {{ $t('ops.statusLabel') || 'Status' }} <strong>{{ $t('campaign.status' + camp.status.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join('')) }}</strong> · {{ $t('ops.lotteryMode') }} <strong>{{ $t('ops.lottery' + camp.lotteryMode.charAt(0).toUpperCase() + camp.lotteryMode.slice(1).toLowerCase()) }}</strong> · {{ $t('ops.winnerCount') }} <strong>{{ camp.winnerCount }}</strong>{{ $t('common.person') || '名' }}
      <span v-if="camp.totalRewardPoints > 0 || camp.rewardsConfig !== '[]'">
        · {{ $t('ops.totalReward') }} 
        <template v-if="camp.rewardsConfig && camp.rewardsConfig !== '[]'">
          <span v-for="(r, idx) in JSON.parse(camp.rewardsConfig)" :key="idx">
            {{ Number(idx) > 0 ? ', ' : '' }}
            <strong>{{ r.amount.toLocaleString() }}</strong>{{ r.currency === 'POINT' ? 'P' : r.currency === 'COUPON' ? '개 (뽑기 쿠폰)' : ' ' + r.currency }}
            <span v-if="camp.rewardDistMode === 'SEPARATE'" style="font-size: 0.85em; opacity: 0.8"> ({{ r.winnerCount }}명 당첨)</span>
          </span>
        </template>
        <template v-else>
          <strong>{{ camp.totalRewardPoints.toLocaleString() }}</strong>{{ camp.rewardCurrency === 'POINT' ? 'P' : ' ' + camp.rewardCurrency }}
        </template>
      </span>
    </p>
    <div class="operator-pill-tabs">
      <button
        type="button"
        class="opt-tab-btn"
        :class="{ active: tab === 'compose' }"
        @click="openTab('compose')"
      >
        ⚙️ {{ $t('ops.tabSettings') || 'Settings' }}
      </button>
      <button
        type="button"
        class="opt-tab-btn"
        :class="{ active: tab === 'stats' }"
        @click="openTab('stats')"
      >
        📊 {{ $t('ops.tabStats') || 'Statistics' }}
      </button>
      <button
        type="button"
        class="opt-tab-btn"
        :class="{ active: tab === 'submissions' }"
        @click="openTab('submissions')"
      >
        📥 제출 검수
      </button>
      <button
        type="button"
        class="opt-tab-btn"
        :class="{ active: tab === 'participants' }"
        @click="openTab('participants')"
      >
        👥 {{ $t('ops.participants') || 'Participants' }}
      </button>
      <button
        type="button"
        class="opt-tab-btn"
        :class="{ active: tab === 'winners' }"
        @click="openTab('winners')"
      >
        🏆 {{ $t('ops.winners') || 'Winners' }}
      </button>
    </div>
    <p v-if="err" class="err">{{ err }}</p>

    <section v-if="tab === 'stats' && stats" class="card stats-section">
      <div class="stats-overview">
        <div class="stat-box">
          <label>{{ $t('ops.totalSubmissions') || 'Total Submissions' }}</label>
          <div class="val">{{ stats.submissions.total }}</div>
        </div>
        <div class="stat-box">
          <label>{{ $t('ops.approvedSubs') || 'Approved' }}</label>
          <div class="val text-mint">{{ stats.submissions.approved }}</div>
        </div>
        <div class="stat-box">
          <label>{{ $t('ops.pendingSubs') || 'Pending' }}</label>
          <div class="val text-orange">{{ stats.submissions.pending }}</div>
        </div>
        <div class="stat-box">
          <label>{{ $t('ops.winnersCount') || 'Winners' }}</label>
          <div class="val text-accent">{{ stats.winners }}</div>
        </div>
      </div>

      <div class="mission-stats-list">
        <h3 style="margin: 1.5rem 0 1rem; font-size: 1.1rem">{{ $t('ops.missionStats') || 'Missions Performance' }}</h3>
        <div v-for="m in stats.byMission" :key="m.missionId" class="m-stat-row">
          <div class="m-stat-info">
            <strong>{{ m.title }}</strong>
            <div class="m-stat-bars">
              <div class="bar-fill approved" :style="{ width: (m.approved / (m.approved + m.pending + m.rejected || 1) * 100) + '%' }"></div>
              <div class="bar-fill pending" :style="{ width: (m.pending / (m.approved + m.pending + m.rejected || 1) * 100) + '%' }"></div>
            </div>
          </div>
          <div class="m-stat-counts">
            <span class="c-approved">{{ m.approved }}</span> / 
            <span class="c-pending">{{ m.pending }}</span> / 
            <span class="c-rejected">{{ m.rejected }}</span>
          </div>
        </div>
      </div>
    </section>

    <section v-if="tab === 'compose'" class="card">
      <h2 style="font-size: 1.05rem; color: var(--text-h); margin: 0 0 0.75rem">{{ $t('ops.campaignSection') }}</h2>
      <div class="field">
        <label>{{ $t('ops.campaignTitle') }}</label>
        <input v-model="draftTitle" />
      </div>
      <div class="field">
        <label>{{ $t('ops.description') }}</label>
        <RichEditor v-model="draftDescription" :placeholder="t('ops.descPlaceholder')" />
      </div>

      <template v-if="isEditable">
        <h2 style="font-size: 1.05rem; color: var(--text-h); margin: 1.25rem 0 0.75rem">{{ $t('ops.clientSection') }}</h2>
        <div class="field">
          <label>{{ $t('ops.companyName') }}</label>
          <input v-model="draftCompanyName" />
        </div>
        <div class="field">
          <label>{{ $t('ops.companyLogo') }}</label>
          <div class="logo-row">
            <img v-if="draftCompanyLogo" :src="getFileUrl(draftCompanyLogo)" alt="" class="logo-preview" />
            <div class="logo-actions">
              <input
                ref="logoFileInput"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                class="sr-only"
                @change="onDraftLogoFile"
              />
              <button type="button" class="btn" :disabled="logoUploading" @click="logoFileInput?.click()">
                {{ logoUploading ? $t('ops.uploading') : $t('ops.selectFile') }}
              </button>
              <button v-if="draftCompanyLogo" type="button" class="btn" @click="clearDraftLogo">{{ $t('ops.remove') }}</button>
            </div>
          </div>
          <p class="logo-hint">{{ $t('ops.logoHint') }}</p>
        </div>
        <div class="field">
          <label>{{ $t('ops.logoUrl') }}</label>
          <input v-model="draftCompanyLogo" type="text" placeholder="https://… or /uploads/…" />
        </div>

        <div class="field">
          <label>보상 배분 방식</label>
          <select v-model="draftRewardDistMode">
            <option value="COMBINED">분배형 (모든 보상을 당첨자들에게 균등 분배)</option>
            <option value="SEPARATE">개별형 (보상별 당첨자를 따로 추첨 및 설정)</option>
          </select>
        </div>
        <div class="field" v-if="draftRewardDistMode === 'COMBINED'">
          <label>{{ $t('ops.winnerCount') }}</label>
          <input v-model.number="draftWinnerCount" type="number" min="1" />
        </div>
        <div class="field" v-else>
          <label>{{ $t('ops.winnerCount') }}</label>
          <div style="font-size: 0.9rem; color: var(--muted); padding: 0.5rem 0;">
            * 개별형 설정 시 각 보상 항목별로 지정된 당첨 인원이 개별 적용됩니다.
          </div>
        </div>
        <div class="field">
          <label>{{ $t('ops.lotteryMode') }}</label>
          <select v-model="draftLotteryMode">
            <option value="SIMPLE">{{ $t('ops.lotterySimple') }}</option>
            <option value="WEIGHTED">{{ $t('ops.lotteryWeighted') }}</option>
          </select>
        </div>
        <label style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem">
          <input v-model="draftAutoApprove" type="checkbox" />
          {{ $t('ops.autoApprove') }}
        </label>
        <!-- 보유 잔액 정보 -->
        <div class="creator-balance-info" v-if="auth.user && camp && camp.creatorId === auth.user.id">
          <div class="balance-info-header">내 보유 잔액</div>
          <div class="balance-chips">
            <span class="balance-chip">🪙 포인트: {{ (auth.user.pointBalance || 0).toLocaleString() }}P</span>
            <span class="balance-chip">🎟️ 티켓: {{ (auth.user.couponBalance || 0).toLocaleString() }}장</span>
            <span class="balance-chip">💵 USDT: {{ (auth.user.usdtBalance || 0).toLocaleString(undefined, { maximumFractionDigits: 4 }) }}</span>
            <span class="balance-chip">🇧🇷 BRL: {{ (auth.user.brlBalance || 0).toLocaleString(undefined, { maximumFractionDigits: 4 }) }}</span>
            <span class="balance-chip">💎 METAQ: {{ (auth.user.metaqBalance || 0).toLocaleString(undefined, { maximumFractionDigits: 4 }) }}</span>
          </div>
        </div>

        <div class="field">
          <label>{{ $t('ops.totalReward') }}</label>
          <div v-for="(r, idx) in draftRewards" :key="idx" style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem">
            <div style="display: flex; gap: 0.5rem; align-items: center" :class="{ 'has-error': r.currency !== 'OTHER' && r.currency !== 'COUPON' && balanceErrors.some(e => e.includes(r.currency)) }">
              <input v-model.number="r.amount" type="number" min="0" step="any" style="flex: 1" />
              <select v-model="r.currency" style="width: 120px" @change="checkWalletRequirement(r, $event)">
                <option value="POINT">{{ $t('common.point') || 'POINT' }}</option>
                <option value="USDT">USDT</option>
                <option value="BRL">BRL ({{ $t('common.brl') || 'Real' }})</option>
                <option value="METAQ">METAQ ({{ $t('common.metaq') || 'Coin' }})</option>
                <option value="COUPON">뽑기 쿠폰</option>
                <option value="OTHER">기타 보상</option>
              </select>
              <div v-if="draftRewardDistMode === 'SEPARATE'" style="display: flex; align-items: center; gap: 0.25rem">
                <input v-model.number="r.winnerCount" type="number" min="1" placeholder="당첨자 수" style="width: 90px" required />
                <span style="font-size: 0.85rem">명</span>
              </div>
              <button v-if="draftRewards.length > 1" type="button" class="btn outline" @click="removeDraftReward(idx)">✕</button>
            </div>
            <div v-if="r.currency === 'OTHER'" style="display: flex; gap: 0.5rem">
              <input v-model="r.customCurrency" type="text" placeholder="보상명 (예: 스타벅스 디저트 쿠폰, 문화상품권 등)" style="flex: 1" required />
            </div>
          </div>
          <button type="button" class="btn btn-sm" @click="addDraftReward">+ {{ $t('ops.addReward') || 'Add Reward' }}</button>

          <!-- 잔액 부족 경고 -->
          <div v-if="balanceErrors.length > 0" class="balance-error-box" style="margin-top: 1rem">
            <div v-for="err in balanceErrors" :key="err" class="error-msg">
              ⚠️ {{ err }}
            </div>
            <p class="store-redirect-notice">
              잔액이 부족합니다. 상점에서 충전한 후 변경 사항을 저장해 주세요.
              <RouterLink to="/store" class="btn btn-sm btn-recharge-direct">상점 바로가기 ➔</RouterLink>
            </p>
          </div>
          
          <div class="reward-hint" style="margin-top: 0.5rem; font-size: 0.85rem; opacity: 0.8">
            <template v-if="draftRewardDistMode === 'SEPARATE'">
              <p v-for="(r, idx) in draftRewards" :key="idx" style="margin: 0">
                • {{ r.currency === 'OTHER' ? (r.customCurrency || '기타 보상') : r.currency === 'COUPON' ? '뽑기 쿠폰' : (r.currency === 'POINT' ? $t('common.point') : r.currency) }}: 1인당 {{ Math.floor(r.amount / (r.winnerCount || 1)).toLocaleString() }}{{ r.currency === 'OTHER' || r.currency === 'COUPON' ? '개' : '' }} (당첨자: {{ r.winnerCount || 1 }}명)
              </p>
            </template>
            <template v-else-if="draftWinnerCount > 0">
              <p v-for="(r, idx) in draftRewards" :key="idx" style="margin: 0">
                • {{ r.currency === 'OTHER' ? (r.customCurrency || '기타 보상') : r.currency === 'COUPON' ? '뽑기 쿠폰' : (r.currency === 'POINT' ? $t('common.point') : r.currency) }}: 1인당 {{ Math.floor(r.amount / draftWinnerCount).toLocaleString() }}{{ r.currency === 'OTHER' || r.currency === 'COUPON' ? '개' : '/' + ($t('common.person') || 'person') }} (공동 당첨자: {{ draftWinnerCount }}명)
              </p>
            </template>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem">
          <div class="field">
            <label>{{ $t('ops.startsAt') }}</label>
            <input v-model="draftStartsAt" type="datetime-local" />
          </div>
          <div class="field">
            <label>{{ $t('ops.endsAt') }}</label>
            <input v-model="draftEndsAt" type="datetime-local" />
          </div>
          <div class="field">
            <label>추첨 예정 일시</label>
            <input v-model="draftDrawAt" type="datetime-local" />
          </div>
        </div>

        <h2 style="font-size: 1.05rem; color: var(--text-h); margin: 1.25rem 0 0.75rem">{{ $t('ops.missionSection') }}</h2>
        <MissionListEditor v-model="missionRows" />
      </template>

      <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem; align-items: center;">
        <button type="button" class="btn primary" :disabled="saving" @click="saveDraft">
          {{ saving ? $t('ops.saving') : $t('ops.saveDraft') }}
        </button>
        <button
          v-if="auth.user?.role === 'ADMIN'"
          type="button"
          class="btn"
          style="background-color: var(--danger, #ef4444); color: white; border: none; font-weight: 800;"
          :disabled="saving"
          @click="deleteCampaign"
        >
          🗑️ 캠페인 삭제
        </button>
      </div>
    </section>

    <section v-if="tab === 'participants'" class="card">
      <div v-for="u in participants" :key="u.email" style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border)">
        <div>
          <strong>{{ u.email }}</strong>
          <div style="font-size: 0.85rem; color: var(--muted)">{{ $t('ops.completedMissionCount') }}: {{ u.completed }} / {{ camp.missions.length }}</div>
        </div>
        <span :style="{ color: u.completed >= camp.missions.length ? 'var(--mint)' : 'var(--muted)' }">{{ u.status }}</span>
      </div>
      <p v-if="!participants.length" style="color: var(--muted)">{{ $t('ops.noParticipants') || 'No Participants' }}</p>
    </section>

    <section v-if="tab === 'winners'" class="card">
      <div v-for="w in winnersList" :key="w.email" style="padding: 0.75rem 0; border-bottom: 1px solid var(--border)">
        <strong>{{ w.email }}</strong>
      </div>
      <p v-if="!winnersList.length" style="color: var(--muted)">{{ $t('ops.noWinners') || 'No Winners' }}</p>
    </section>

    <section v-if="tab === 'submissions'" class="card">
      <div v-if="subLoading" style="color: var(--muted); padding: 1.5rem; text-align: center;">
        {{ $t('detail.loading') }}
      </div>
      <template v-else>
        <!-- Sub-tabs for filtering by SURVEY or FILE_UPLOAD -->
        <div class="sub-filter-tabs">
          <button 
            type="button" 
            class="sub-filter-btn" 
            :class="{ active: subFilter === 'SURVEY' }"
            @click="subFilter = 'SURVEY'"
          >
            📝 설문조사 검수
          </button>
          <button 
            type="button" 
            class="sub-filter-btn" 
            :class="{ active: subFilter === 'FILE_UPLOAD' }"
            @click="subFilter = 'FILE_UPLOAD'"
          >
            📁 파일 업로드 검수
          </button>
        </div>

        <div v-if="!filteredSubmissions.length" style="color: var(--muted); padding: 1.5rem; text-align: center;">
          제출된 내역이 없습니다.
        </div>
        <div v-else class="submission-list">
          <div 
            v-for="s in filteredSubmissions" 
            :key="s.id" 
            class="sub-item"
          >
            <!-- Left side: User details & Mission details -->
            <div class="sub-main">
              <div class="sub-header">
                <span class="user-nickname">{{ s.user.nickname || '익명' }}</span>
                <span class="user-email">({{ s.user.email }})</span>
                <span class="mission-badge">
                  <span class="m-icon">{{ typeIcons[s.mission.type] || '✨' }}</span>
                  {{ s.mission.title }}
                </span>
              </div>
              
              <!-- Payload Detail -->
              <div class="sub-payload">
                <!-- If SURVEY: Parse and display questions/answers beautifully -->
                <template v-if="s.mission.type === 'SURVEY'">
                  <div class="survey-answers">
                    <div 
                      v-for="(ansStr, idx) in parseSurveyPayload(s)" 
                      :key="idx" 
                      class="survey-ans-row"
                    >
                      <span class="q-label">Q.</span>
                      <div class="q-content">
                        <div class="q-question">{{ ansStr.question }}</div>
                        <div class="q-answer">{{ ansStr.answer }}</div>
                      </div>
                    </div>
                  </div>
                </template>
                
                <!-- If FILE_UPLOAD: Display download link and image preview -->
                <template v-else-if="s.mission.type === 'FILE_UPLOAD'">
                  <div class="file-upload-payload">
                    <div class="file-link-container">
                      <span class="file-icon">📁</span>
                      <a :href="getFileUrl(getFileUrlFromPayload(s))" target="_blank" class="file-link">
                        제출된 파일 열기
                      </a>
                    </div>
                    <!-- Show image preview if image -->
                    <div v-if="isImageFile(getFileUrlFromPayload(s))" class="image-preview-container">
                      <img :src="getFileUrl(getFileUrlFromPayload(s))" alt="제출 파일 미리보기" class="image-preview-img" />
                    </div>
                  </div>
                </template>
                
                <!-- Default payload parser -->
                <template v-else>
                  <div class="default-payload-text">
                    {{ parsePayloadDetail(s) }}
                  </div>
                </template>
              </div>
              
              <div class="sub-meta">
                제출 일시: {{ new Date(s.createdAt).toLocaleString() }}
              </div>
            </div>
            
            <!-- Right side: Status and actions -->
            <div class="sub-actions">
              <!-- Status Badge -->
              <div class="status-badge-container">
                <span class="status-badge" :class="s.status.toLowerCase()">
                  {{ s.status === 'PENDING' ? '검수 대기' : s.status === 'APPROVED' ? '승인 완료' : '반려됨' }}
                </span>
              </div>
              
              <!-- Action Buttons -->
              <div class="action-btn-group">
                <button 
                  type="button" 
                  class="btn-approve" 
                  :disabled="s.status === 'APPROVED'" 
                  @click="updateSubmissionStatus(s.id, 'APPROVED')"
                >
                  ✓ 승인
                </button>
                <button 
                  type="button" 
                  class="btn-reject" 
                  :disabled="s.status === 'REJECTED'" 
                  @click="updateSubmissionStatus(s.id, 'REJECTED')"
                >
                  ✕ 반려
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </section>
  </div>
  <p v-else-if="err && !camp" class="err">{{ err }}</p>
  <p v-else-if="!camp">{{ $t('detail.loading') }}</p>
</template>

<style scoped>
.operator-pill-tabs {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 2rem;
  background: var(--bg-deep);
  padding: 0.4rem;
  border-radius: 18px;
  border: 1px solid var(--border);
}
.opt-tab-btn {
  padding: 0.65rem 1.25rem;
  border: none;
  background: transparent;
  border-radius: 14px;
  font-weight: 800;
  font-size: 0.9rem;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.opt-tab-btn:hover {
  color: var(--text-h);
}
.opt-tab-btn:active {
  transform: scale(0.96);
}
.opt-tab-btn.active {
  background: var(--panel);
  color: var(--accent);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border);
}

.logo-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.logo-preview {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  object-fit: cover;
  border: 1px solid var(--border);
}
.logo-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
.logo-hint {
  margin: 0.35rem 0 0;
  font-size: 0.82rem;
  color: var(--muted);
}
@media (max-width: 768px) {
  .logo-row { flex-direction: column; align-items: flex-start; }
  .logo-actions { width: 100%; }
  .logo-actions button { flex: 1; }
}

/* Stats Styles */
.stats-section {
  padding: 1.5rem;
}
.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
}
.stat-box {
  background: var(--bg-deep);
  padding: 1.5rem;
  border-radius: 20px;
  text-align: center;
  border: 1px solid var(--border);
}
.stat-box label { font-size: 0.85rem; color: var(--muted); font-weight: 700; display: block; margin-bottom: 0.5rem; }
.stat-box .val { font-size: 1.75rem; font-weight: 900; }
.text-mint { color: var(--mint); }
.text-orange { color: #f97316; }
.text-accent { color: var(--accent); }

.m-stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--bg-deep);
  border-radius: 16px;
  margin-bottom: 0.75rem;
  gap: 1.5rem;
}
.m-stat-info { flex: 1; }
.m-stat-bars {
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  margin-top: 0.5rem;
  display: flex;
  overflow: hidden;
}
.bar-fill { height: 100%; }
.bar-fill.approved { background: var(--mint); }
.bar-fill.pending { background: #f97316; }
.m-stat-counts { font-size: 0.9rem; font-weight: 700; white-space: nowrap; }
.c-approved { color: var(--mint); }
.c-pending { color: #f97316; }
.c-rejected { color: #ef4444; }

/* Submissions Styles */
.submission-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-top: 1rem;
}
.sub-item {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  background: var(--bg-deep);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 1.25rem;
  gap: 1.5rem;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.sub-item:hover {
  border-color: var(--accent-border);
  box-shadow: 0 4px 20px rgba(0,0,0,0.02);
}
.sub-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.sub-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.user-nickname {
  font-weight: 800;
  color: var(--text-h);
}
.user-email {
  font-size: 0.85rem;
  color: var(--muted);
}
.mission-badge {
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  background: var(--accent-soft);
  color: var(--accent);
  border-radius: 99px;
  border: 1px solid var(--accent-border);
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
.sub-payload {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem;
}
.survey-answers {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.survey-ans-row {
  display: flex;
  gap: 0.5rem;
  font-size: 0.95rem;
  line-height: 1.5;
}
.q-label {
  font-weight: 800;
  color: var(--accent);
}
.q-content {
  display: flex;
  flex-direction: column;
}
.q-question {
  font-weight: 700;
  color: var(--text-h);
}
.q-answer {
  color: var(--text-p);
  margin-top: 0.15rem;
  background: var(--bg-deep);
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--border);
}
.file-upload-payload {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.file-link-container {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.file-link {
  font-weight: 700;
  color: var(--accent);
  text-decoration: none;
  transition: opacity 0.2s;
}
.file-link:hover {
  text-decoration: underline;
  opacity: 0.85;
}
.image-preview-container {
  max-width: 320px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--bg-deep);
  line-height: 0;
}
.image-preview-img {
  width: 100%;
  height: auto;
  max-height: 200px;
  object-fit: contain;
  cursor: pointer;
  transition: transform 0.2s ease;
}
.image-preview-img:hover {
  transform: scale(1.02);
}
.default-payload-text {
  font-family: var(--mono);
  font-size: 0.85rem;
  word-break: break-all;
}
.sub-meta {
  font-size: 0.8rem;
  color: var(--muted);
}
.sub-actions {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  min-width: 140px;
  gap: 1rem;
}
.status-badge-container {
  display: flex;
  justify-content: flex-end;
}
.status-badge {
  font-size: 0.8rem;
  font-weight: 800;
  padding: 0.25rem 0.75rem;
  border-radius: 99px;
  display: inline-flex;
}
.status-badge.pending {
  background: rgba(249, 115, 22, 0.12);
  color: #f97316;
  border: 1px solid rgba(249, 115, 22, 0.25);
}
.status-badge.approved {
  background: var(--mint-soft);
  color: var(--mint);
  border: 1px solid var(--mint-soft);
}
.status-badge.rejected {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.25);
}
.action-btn-group {
  display: flex;
  gap: 0.5rem;
}
.btn-approve, .btn-reject {
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--panel);
}
.btn-approve {
  color: var(--mint);
  border-color: var(--mint-soft);
}
.btn-approve:hover:not(:disabled) {
  background: var(--mint-soft);
}
.btn-reject {
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.12);
}
.btn-reject:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.12);
}
.btn-approve:disabled, .btn-reject:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* Sub Filter Tabs */
.sub-filter-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.75rem;
}
.sub-filter-btn {
  padding: 0.55rem 1.1rem;
  border: none;
  background: transparent;
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--muted);
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
}
.sub-filter-btn:hover {
  color: var(--text-h);
  background: var(--bg-deep);
}
.sub-filter-btn.active {
  color: var(--accent);
  background: var(--accent-soft);
  border-color: var(--accent-border);
}

@media (max-width: 768px) {
  .sub-item {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  .sub-actions {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    min-width: 0;
  }
}

/* Balance Dashboard styles */
.creator-balance-info {
  background: rgba(99, 102, 241, 0.04);
  border: 1px solid rgba(99, 102, 241, 0.1);
  border-radius: 16px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}
:root.dark .creator-balance-info {
  background: rgba(99, 102, 241, 0.08);
  border-color: rgba(99, 102, 241, 0.2);
}
.balance-info-header {
  font-size: 0.85rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #4f46e5;
  margin-bottom: 0.75rem;
}
:root.dark .balance-info-header {
  color: #818cf8;
}
.balance-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.balance-chip {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 99px;
  padding: 0.4rem 1rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: #334155;
  box-shadow: 0 2px 6px rgba(0,0,0,0.02);
}
:root.dark .balance-chip {
  background: #1e293b;
  border-color: #334155;
  color: #e2e8f0;
}

/* Balance Error Box */
.balance-error-box {
  background: rgba(239, 68, 68, 0.05);
  border: 1px dashed rgba(239, 68, 68, 0.3);
  border-radius: 16px;
  padding: 1.25rem;
  margin-top: 1.25rem;
}
.balance-error-box .error-msg {
  color: #ef4444;
  font-size: 0.9rem;
  font-weight: 700;
  margin-bottom: 0.4rem;
}
.balance-error-box .error-msg:last-of-type {
  margin-bottom: 1rem;
}
.store-redirect-notice {
  font-size: 0.9rem;
  color: #64748b;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
}
:root.dark .store-redirect-notice {
  color: #94a3b8;
}
.btn-recharge-direct {
  background: #ef4444 !important;
  color: white !important;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2) !important;
  border: none !important;
  padding: 0.4rem 1rem !important;
  font-size: 0.85rem !important;
  font-weight: 800 !important;
  margin-top: 0.25rem;
  text-decoration: none;
  border-radius: 8px;
}
.btn-recharge-direct:hover {
  background: #dc2626 !important;
  transform: translateY(-1px);
}
.has-error {
  border: 2px solid #ef4444 !important;
  border-radius: 12px;
  padding: 0.25rem;
}
</style>
