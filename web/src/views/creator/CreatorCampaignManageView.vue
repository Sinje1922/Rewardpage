<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api, getFileUrl } from '../../api/client'
import { uploadCompanyLogo } from '../../api/upload'
import * as XLSX from 'xlsx'
import MissionListEditor from '../../components/ops/MissionListEditor.vue'
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
  lotteryMode: string
  winnerCount: number
  totalRewardPoints: number
  autoApprove: boolean
  startsAt: string | null
  endsAt: string | null
  missions: Mission[]
}

type SubRow = {
  id: string
  status: string
  payload: string
  createdAt: string
  missionId: string
  user: { email: string }
  mission: { title: string; type: string; config: string }
}

type Stats = {
  submissions: { total: number; approved: number; pending: number; rejected: number }
  winners: number
  byMission: { missionId: string; title: string; approved: number; pending: number; rejected: number }[]
}

type TabId = 'compose' | 'missions' | 'subs' | 'stats' | 'draw'

const { t } = useI18n()
const route = useRoute()
const camp = ref<CampaignDetail | null>(null)
const submissions = ref<SubRow[]>([])
const stats = ref<Stats | null>(null)
const err = ref('')
const tab = ref<TabId>('compose')
const saving = ref(false)
const logoUploading = ref(false)
const logoFileInput = ref<HTMLInputElement | null>(null)

const isDraftLike = computed(
  () => !!camp.value && (camp.value.status === 'DRAFT' || camp.value.status === 'PENDING_ADMIN')
)

const draftCompanyName = ref('')
const draftCompanyLogo = ref('')
const draftTitle = ref('')
const draftDescription = ref('')
const draftWinnerCount = ref(1)
const draftLotteryMode = ref<'SIMPLE' | 'WEIGHTED'>('SIMPLE')
const draftAutoApprove = ref(true)
const draftTotalRewardPoints = ref(0)
const draftStartsAt = ref('')
const draftEndsAt = ref('')
const missionRows = ref<MissionRowState[]>([emptyMissionRow(0)])

const mType = ref('LINK_VISIT')
const mTitle = ref('')
const mDesc = ref('')
const mOrder = ref(0)
const cfgLinkUrl = ref('')
const cfgMinDwell = ref(0)
const cfgCorrectCode = ref('')
const cfgSurveyNote = ref('')
const cfgQuizQuestion = ref('')
const cfgQuizOptions = ref(['', ''])
const cfgQuizCorrect = ref(0)
const cfgFileNote = ref('')

function addQuizOption() {
  cfgQuizOptions.value.push('')
}
function removeQuizOption(idx: number) {
  if (cfgQuizOptions.value.length > 1) {
    cfgQuizOptions.value.splice(idx, 1)
    if (cfgQuizCorrect.value >= cfgQuizOptions.value.length) {
      cfgQuizCorrect.value = cfgQuizOptions.value.length - 1
    }
  }
}

function syncDraftFromCamp() {
  const c = camp.value
  if (!c) return
  draftCompanyName.value = c.companyName ?? ''
  draftCompanyLogo.value = c.companyLogoUrl ?? ''
  draftTitle.value = c.title
  draftDescription.value = c.description ?? ''
  draftWinnerCount.value = c.winnerCount
  draftLotteryMode.value = (c.lotteryMode as 'SIMPLE' | 'WEIGHTED') || 'SIMPLE'
  draftAutoApprove.value = c.autoApprove ?? true
  draftTotalRewardPoints.value = c.totalRewardPoints ?? 0
  draftStartsAt.value = c.startsAt ? toLocalInput(c.startsAt) : ''
  draftEndsAt.value = c.endsAt ? toLocalInput(c.endsAt) : ''
  missionRows.value =
    c.missions?.length ? c.missions.map((m) => apiMissionToRow(m)) : [emptyMissionRow(0)]
}

function toLocalInput(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function reload() {
  const id = route.params.id as string
  const { data } = await api.get<CampaignDetail>(`/campaigns/${id}`)
  camp.value = data
  syncDraftFromCamp()
  if (!isDraftLike.value) {
    tab.value = 'missions'
  } else {
    tab.value = 'compose'
  }
}

async function loadSubs() {
  const id = route.params.id as string
  const { data } = await api.get<SubRow[]>(`/campaigns/${id}/submissions`)
  submissions.value = data
}

async function loadStats() {
  const id = route.params.id as string
  const { data } = await api.get<Stats>(`/campaigns/${id}/stats`)
  stats.value = data
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

async function saveDraft() {
  err.value = ''
  const v = validateRows(missionRows.value)
  if (v) {
    err.value = v
    return
  }
  if (!draftTitle.value.trim()) {
    err.value = t('ops.titleRequired')
    return
  }
  const id = route.params.id as string
  const missions = missionRows.value.map((r, i) => rowToPayload(r, i))
  saving.value = true
  try {
    await api.patch(`/campaigns/${id}`, {
      title: draftTitle.value.trim(),
      description: draftDescription.value,
      companyName: draftCompanyName.value.trim(),
      companyLogoUrl: draftCompanyLogo.value.trim(),
      winnerCount: draftWinnerCount.value,
      lotteryMode: draftLotteryMode.value,
      autoApprove: draftAutoApprove.value,
      totalRewardPoints: draftTotalRewardPoints.value,
      startsAt: draftStartsAt.value ? new Date(draftStartsAt.value).toISOString() : null,
      endsAt: draftEndsAt.value ? new Date(draftEndsAt.value).toISOString() : null,
      missions,
    })
    await reload()
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { error?: string } } }
    err.value = ax.response?.data?.error ?? t('ops.saveFail')
  } finally {
    saving.value = false
  }
}

async function addMission() {
  err.value = ''
  const id = route.params.id as string

  let cfg: Record<string, unknown> = {}
  if (mType.value === 'LINK_VISIT') {
    cfg = { linkUrl: cfgLinkUrl.value, minDwellSeconds: cfgMinDwell.value }
  } else if (mType.value === 'CODE') {
    cfg = { correctCode: cfgCorrectCode.value }
  } else if (mType.value === 'SURVEY') {
    cfg = { linkUrl: cfgLinkUrl.value, correctCode: cfgCorrectCode.value, surveyNote: cfgSurveyNote.value }
  } else if (mType.value === 'QUIZ') {
    cfg = {
      quizQuestion: cfgQuizQuestion.value,
      quizOptions: cfgQuizOptions.value.filter((o) => o.trim()),
      correctIndex: cfgQuizCorrect.value,
    }
  } else if (mType.value === 'FILE_UPLOAD') {
    cfg = { fileNote: cfgFileNote.value }
  }

  try {
    await api.post(`/campaigns/${id}/missions`, {
      type: mType.value,
      title: mTitle.value,
      description: mDesc.value,
      sortOrder: mOrder.value,
      config: cfg,
    })
    mTitle.value = ''
    mDesc.value = ''
    cfgLinkUrl.value = ''
    cfgMinDwell.value = 0
    cfgCorrectCode.value = ''
    cfgSurveyNote.value = ''
    cfgQuizQuestion.value = ''
    cfgQuizOptions.value = ['', '']
    cfgQuizCorrect.value = 0
    cfgFileNote.value = ''
    await reload()
  } catch {
    err.value = t('ops.missionAddFail') || 'Mission Add Fail'
  }
}

async function setSubmission(id: string, status: 'APPROVED' | 'REJECTED') {
  await api.patch(`/submissions/${id}`, { status })
  await loadSubs()
  await loadStats()
}

async function runDraw() {
  err.value = ''
  try {
    const id = route.params.id as string
    await api.post(`/campaigns/${id}/draw`)
    await reload()
    tab.value = 'draw'
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { error?: string } } }
    err.value = ax.response?.data?.error ?? (t('ops.drawFail') || 'Draw Fail')
  }
}

async function openTab(t: TabId) {
  tab.value = t
  err.value = ''
  if (t === 'subs') await loadSubs()
  if (t === 'stats') await loadStats()
}

function parsePayloadDetail(s: SubRow) {
  try {
    const p = JSON.parse(s.payload || '{}')
    const c = JSON.parse(s.mission.config || '{}')
    
    switch (s.mission.type) {
      case 'QUIZ': {
        const selected = p.selectedIndex !== undefined ? (c.quizOptions?.[p.selectedIndex] ?? `Index: ${p.selectedIndex}`) : '미선택'
        const isCorrect = p.selectedIndex === c.correctIndex
        return `[선택] ${selected} (${isCorrect ? '정답' : '오답'})`
      }
      case 'SURVEY': {
        // 다중 질문 답변 처리
        if (p.answers && c.surveyQuestions) {
          return c.surveyQuestions.map((q: any, i: number) => {
            const ans = p.answers[q.id]
            let displayAns = ans ?? '미응답'
            if (q.type === 'OBJECTIVE' && ans !== undefined) {
              displayAns = q.options?.[ans] ?? ans
            }
            return `Q${i + 1}. ${q.question}: ${displayAns}`
          }).join(' | ')
        }
        // 레거시 또는 단일 응답 처리
        return p.code || p.note || '제출됨'
      }
      case 'CODE':
        return p.code || '정답제출'
      case 'LINK_VISIT':
        return p.dwellSeconds ? `${p.dwellSeconds}초 체류` : '방문완료'
      case 'FILE_UPLOAD':
        return p.fileUrl || '파일업로드'
      default:
        // 정의되지 않은 필드들도 최대한 보여줌
        const keys = Object.keys(p)
        if (keys.length > 0) {
          return keys.map(k => `${k}: ${p[k]}`).join(', ')
        }
        return '참여완료'
    }
  } catch {
    return '데이터 파싱 오류'
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
    const userMap = new Map<string, { email: string; completed: number; status: string }>()
    
    allSubs.forEach(s => {
      if (!userMap.has(s.user.email)) {
        userMap.set(s.user.email, { email: s.user.email, completed: 0, status: '미흡' })
      }
      if (s.status === 'APPROVED') {
        userMap.get(s.user.email)!.completed++
      }
    })
    
    const summaryRows = [...userMap.values()].map(u => ({
      '이메일': u.email,
      '완료 미션 수': u.completed,
      '총 미션 수': missionCount,
      '모든 미션 완료 여부': u.completed >= missionCount ? '완료 (추첨대상)' : '미완료'
    }))
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryRows)
    XLSX.utils.book_append_sheet(workbook, summarySheet, '참여자 요약')
    
    // 2. 미션별 시트 생성
    camp.value.missions.forEach(m => {
      const mSubs = allSubs.filter(s => s.missionId === m.id)
      const rows = mSubs.map(s => ({
        '이메일': s.user.email,
        '상태': s.status,
        '답변/내용': parsePayloadDetail(s),
        '제출_시각': new Date(s.createdAt).toLocaleString()
      }))
      
      const sheet = XLSX.utils.json_to_sheet(rows)
      // 시트명 금지 문자 제거 및 길이 제한 (31자)
      const sheetName = m.title.replace(/[\\/?*[\]]/g, '').slice(0, 25) + `_${m.type.slice(0, 4)}`
      XLSX.utils.book_append_sheet(workbook, sheet, sheetName)
    })
    
    XLSX.writeFile(workbook, `Campaign_Export_${camp.value.id}.xlsx`)
  } catch (e) {
    console.error(e)
    err.value = '엑셀 추출 중 오류가 발생했습니다.'
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
      <button v-if="!isDraftLike" type="button" class="btn primary" @click="exportToExcel">
        📊 {{ $t('ops.exportExcel') || '데이터 추출 (Excel)' }}
      </button>
    </div>
    <p style="color: var(--muted); margin-bottom: 0.75rem">
      {{ $t('ops.statusLabel') || 'Status' }} <strong>{{ camp.status }}</strong> · {{ $t('ops.lotteryMode') }} <strong>{{ camp.lotteryMode }}</strong> · {{ $t('ops.winnerCount') }} <strong>{{ camp.winnerCount }}</strong>{{ $t('common.person') || '名' }}
      <span v-if="camp.totalRewardPoints > 0">
        · {{ $t('ops.totalReward') }} <strong>{{ camp.totalRewardPoints.toLocaleString() }}</strong>P ({{ $t('campaign.rewardPerPerson', { points: Math.floor(camp.totalRewardPoints / camp.winnerCount).toLocaleString() }) }})
      </span>
    </p>
    <div style="display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1rem">
      <button
        v-if="isDraftLike"
        type="button"
        class="btn"
        :class="{ primary: tab === 'compose' }"
        @click="openTab('compose')"
      >
        {{ $t('ops.editCompose') || 'Edit Compose' }}
      </button>
      <button
        v-if="!isDraftLike"
        type="button"
        class="btn"
        :class="{ primary: tab === 'missions' }"
        @click="openTab('missions')"
      >
        {{ $t('ops.addMission') || 'Add Mission' }}
      </button>
      <button type="button" class="btn" :class="{ primary: tab === 'subs' }" @click="openTab('subs')">{{ $t('ops.submissions') || 'Submissions' }}</button>
      <button type="button" class="btn" :class="{ primary: tab === 'stats' }" @click="openTab('stats')">{{ $t('ops.stats') || 'Stats' }}</button>
      <button type="button" class="btn" :class="{ primary: tab === 'draw' }" @click="openTab('draw')">{{ $t('ops.draw') || 'Draw' }}</button>
    </div>
    <p v-if="err" class="err">{{ err }}</p>

    <section v-if="tab === 'compose' && isDraftLike" class="card">
      <h2 style="font-size: 1.05rem; color: var(--text-h); margin: 0 0 0.75rem">{{ $t('ops.clientSection') }}</h2>
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

      <h2 style="font-size: 1.05rem; color: var(--text-h); margin: 1.25rem 0 0.75rem">{{ $t('ops.campaignSection') }}</h2>
      <div class="field">
        <label>{{ $t('ops.campaignTitle') }}</label>
        <input v-model="draftTitle" />
      </div>
      <div class="field">
        <label>{{ $t('ops.description') }}</label>
        <textarea v-model="draftDescription" rows="3" />
      </div>
      <div class="field">
        <label>{{ $t('ops.winnerCount') }}</label>
        <input v-model.number="draftWinnerCount" type="number" min="1" />
      </div>
      <div class="field">
        <label>{{ $t('ops.lotteryMode') }}</label>
        <select v-model="draftLotteryMode">
          <option value="SIMPLE">SIMPLE</option>
          <option value="WEIGHTED">WEIGHTED</option>
        </select>
      </div>
      <label style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem">
        <input v-model="draftAutoApprove" type="checkbox" />
        {{ $t('ops.autoApprove') }}
      </label>
      <div class="field">
        <label>{{ $t('ops.totalReward') }}</label>
        <input v-model.number="draftTotalRewardPoints" type="number" min="0" />
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem">
        <div class="field">
          <label>{{ $t('ops.startsAt') }}</label>
          <input v-model="draftStartsAt" type="datetime-local" />
        </div>
        <div class="field">
          <label>{{ $t('ops.endsAt') }}</label>
          <input v-model="draftEndsAt" type="datetime-local" />
        </div>
      </div>

      <h2 style="font-size: 1.05rem; color: var(--text-h); margin: 1.25rem 0 0.75rem">{{ $t('ops.missionSection') }}</h2>
      <MissionListEditor v-model="missionRows" />

      <button type="button" class="btn primary" style="margin-top: 1rem" :disabled="saving" @click="saveDraft">
        {{ saving ? $t('ops.saving') : $t('ops.saveDraft') }}
      </button>
    </section>

    <section v-if="tab === 'missions' && !isDraftLike" class="card">
      <h2 style="font-size: 1.05rem; color: var(--text-h); margin: 0 0 0.75rem">{{ $t('ops.addMission') }}</h2>
      <p style="font-size: 0.9rem; color: var(--muted); margin: 0 0 1rem">
        {{ $t('ops.addMissionNotice') || 'Public campaigns can add missions one by one.' }}
      </p>
      <div class="field">
        <label>{{ $t('ops.type') || 'Type' }}</label>
        <select v-model="mType">
          <option value="LINK_VISIT">LINK_VISIT</option>
          <option value="SURVEY">SURVEY</option>
          <option value="CODE">CODE</option>
          <option value="QUIZ">QUIZ</option>
          <option value="CHECKIN">CHECKIN</option>
          <option value="FILE_UPLOAD">FILE_UPLOAD</option>
        </select>
      </div>
      <div class="field">
        <label>{{ $t('ops.missionTitle') || 'Title' }}</label>
        <input v-model="mTitle" :placeholder="t('ops.titlePlaceholder') || 'e.g. Visit Website'" required />
      </div>
      <div class="field">
        <label>{{ $t('ops.description') }} ({{ $t('common.optional') || 'Optional' }})</label>
        <textarea v-model="mDesc" rows="2" :placeholder="t('ops.descPlaceholder') || 'Enter mission details'" />
      </div>
      <div class="field">
        <label>{{ $t('ops.sortOrder') || 'Sort Order' }}</label>
        <input v-model.number="mOrder" type="number" />
      </div>

      <div style="margin: 1rem 0; padding: 1rem; background: rgba(0, 0, 0, 0.03); border-radius: 8px; border: 1px dashed var(--border)">
        <h3 style="margin-top: 0; font-size: 0.9rem; color: var(--accent); margin-bottom: 0.75rem">{{ $t('ops.typeConfig') || 'Type Config' }}</h3>

        <template v-if="mType === 'LINK_VISIT'">
          <div class="field">
            <label>{{ $t('ops.linkUrl') || 'Link URL' }}</label>
            <input v-model="cfgLinkUrl" type="url" placeholder="https://..." />
          </div>
          <div class="field">
            <label>{{ $t('ops.minDwell') || 'Min Dwell (sec)' }}</label>
            <input v-model.number="cfgMinDwell" type="number" min="0" />
          </div>
        </template>

        <template v-else-if="mType === 'CODE' || mType === 'SURVEY'">
          <div class="field">
            <label>{{ $t('ops.correctCode') || 'Correct Code' }}</label>
            <input v-model="cfgCorrectCode" type="text" :placeholder="t('ops.codePlaceholder') || 'Code to submit'" />
          </div>
          <div v-if="mType === 'SURVEY'" class="field">
            <label>{{ $t('ops.surveyUrl') || 'Survey URL' }}</label>
            <input v-model="cfgLinkUrl" type="url" placeholder="https://..." />
          </div>
          <div v-if="mType === 'SURVEY'" class="field">
            <label>{{ $t('ops.surveyNote') || 'Survey Note' }}</label>
            <textarea v-model="cfgSurveyNote" rows="2" placeholder="Instructions for the user" />
          </div>
        </template>

        <template v-else-if="mType === 'QUIZ'">
          <div class="field">
            <label>{{ $t('ops.quizQuestion') || 'Quiz Question' }}</label>
            <input v-model="cfgQuizQuestion" type="text" placeholder="Enter question" />
          </div>
          <div class="field">
            <label>{{ $t('ops.quizOptions') || 'Options' }}</label>
            <div
              v-for="(_, idx) in cfgQuizOptions"
              :key="idx"
              style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem"
            >
              <input type="radio" :value="idx" v-model="cfgQuizCorrect" />
              <input v-model="cfgQuizOptions[idx]" type="text" :placeholder="t('ops.optionPlaceholder') + ' ' + (idx + 1)" style="flex: 1" />
              <button type="button" class="btn" style="padding: 0.2rem 0.5rem; font-size: 0.8rem" @click="removeQuizOption(idx)">
                {{ $t('ops.remove') }}
              </button>
            </div>
            <button type="button" class="btn" style="width: 100%; margin-top: 0.25rem" @click="addQuizOption">+ {{ $t('ops.addOption') || 'Add Option' }}</button>
          </div>
        </template>

        <template v-else-if="mType === 'FILE_UPLOAD'">
          <div class="field">
            <label>{{ $t('ops.fileNote') || 'Upload Note' }}</label>
            <input v-model="cfgFileNote" type="text" placeholder="e.g. Upload screenshot" />
          </div>
        </template>

        <template v-else-if="mType === 'CHECKIN'">
          <p style="font-size: 0.85rem; color: var(--muted); margin: 0">{{ $t('ops.checkinNotice') || 'Simple check-in mission.' }}</p>
        </template>
      </div>
      <button type="button" class="btn primary" @click="addMission">{{ $t('ops.add') || 'Add' }}</button>

      <h3 style="margin: 1rem 0 0.5rem; font-size: 1rem; color: var(--text-h)">{{ $t('ops.registeredMissions') || 'Registered Missions' }}</h3>
      <ul style="margin: 0; padding-left: 1.1rem">
        <li v-for="m in camp.missions" :key="m.id">{{ m.title }} ({{ m.type }})</li>
      </ul>
    </section>

    <section v-if="tab === 'subs'" class="card">
      <div
        v-for="s in submissions"
        :key="s.id"
        style="margin-bottom: 0.75rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem"
      >
        <strong>{{ s.user.email }}</strong> — {{ s.mission.title }}
        <span style="color: var(--muted); font-size: 0.9rem">({{ s.status }})</span>
        <div style="margin-top: 0.35rem; display: flex; gap: 0.35rem">
          <button type="button" class="btn" @click="setSubmission(s.id, 'APPROVED')">{{ $t('ops.approve') || 'Approve' }}</button>
          <button type="button" class="btn" @click="setSubmission(s.id, 'REJECTED')">{{ $t('ops.reject') || 'Reject' }}</button>
        </div>
      </div>
      <p v-if="!submissions.length" style="color: var(--muted)">{{ $t('ops.noSubmissions') || 'No Submissions' }}</p>
    </section>

    <section v-if="tab === 'stats' && stats" class="card">
      <p>{{ $t('ops.totalSubmissions') || 'Total' }} {{ stats.submissions.total }} / {{ $t('ops.approved') || 'App' }} {{ stats.submissions.approved }} / {{ $t('ops.pending') || 'Pen' }} {{ stats.submissions.pending }}</p>
      <p>{{ $t('ops.winnerCount') }} {{ stats.winners }}</p>
      <ul style="padding-left: 1.1rem">
        <li v-for="b in stats.byMission" :key="b.missionId">{{ b.title }}: {{ $t('ops.approved') || 'App' }} {{ b.approved }}, {{ $t('ops.pending') || 'Pen' }} {{ b.pending }}</li>
      </ul>
    </section>

    <section v-if="tab === 'draw'" class="card">
      <p>{{ $t('ops.drawNotice') || 'Run raffle after campaign is ACTIVE.' }}</p>
      <button type="button" class="btn primary" @click="runDraw">{{ $t('ops.runDraw') || 'Run Raffle' }}</button>
    </section>
  </div>
  <p v-else-if="err && !camp" class="err">{{ err }}</p>
  <p v-else-if="!camp">{{ $t('detail.loading') }}</p>
</template>

<style scoped>
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
</style>
