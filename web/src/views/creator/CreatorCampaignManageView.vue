<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
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
  lotteryMode: string
  winnerCount: number
  totalRewardPoints: number
  rewardCurrency: string
  rewardsConfig: string
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



type TabId = 'compose' | 'participants' | 'winners'

const { t } = useI18n()
const route = useRoute()
const camp = ref<CampaignDetail | null>(null)
const participants = ref<{ email: string; completed: number; status: string }[]>([])
const winnersList = ref<{ email: string }[]>([])
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
const draftRewards = ref<{ amount: number; currency: string }[]>([{ amount: 0, currency: 'POINT' }])
const draftStartsAt = ref('')
const draftEndsAt = ref('')
const missionRows = ref<MissionRowState[]>([emptyMissionRow(0)])





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
  try {
    draftRewards.value = JSON.parse(c.rewardsConfig || "[]")
    if (draftRewards.value.length === 0) {
      draftRewards.value = [{ amount: c.totalRewardPoints ?? 0, currency: c.rewardCurrency ?? 'POINT' }]
    }
  } catch (e) {
    draftRewards.value = [{ amount: c.totalRewardPoints ?? 0, currency: c.rewardCurrency ?? 'POINT' }]
  }
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
  tab.value = 'compose'
}

async function loadParticipants() {
  const id = route.params.id as string
  const { data: allSubs } = await api.get<SubRow[]>(`/campaigns/${id}/submissions`)
  const missionCount = camp.value?.missions.length || 0
  const userMap = new Map<string, { email: string; completed: number; status: string }>()
  
  allSubs.forEach(s => {
    if (!userMap.has(s.user.email)) {
      userMap.set(s.user.email, { email: s.user.email, completed: 0, status: '' })
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

function addDraftReward() {
  draftRewards.value.push({ amount: 0, currency: 'POINT' })
}

function removeDraftReward(index: number) {
  if (draftRewards.value.length > 1) {
    draftRewards.value.splice(index, 1)
  }
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
      totalRewardPoints: draftRewards.value[0]?.amount || 0,
      rewardCurrency: draftRewards.value[0]?.currency || "POINT",
      rewardsConfig: draftRewards.value,
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







async function openTab(t: TabId) {
  tab.value = t
  err.value = ''
  if (t === 'participants') await loadParticipants()
  if (t === 'winners') await loadWinners()
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
    const userMap = new Map<string, { email: string; completed: number; status: string }>()
    
    allSubs.forEach(s => {
      if (!userMap.has(s.user.email)) {
        userMap.set(s.user.email, { email: s.user.email, completed: 0, status: t('common.insufficient') })
      }
      if (s.status === 'APPROVED') {
        userMap.get(s.user.email)!.completed++
      }
    })
    
    const summaryRows = [...userMap.values()].map(u => ({
      [t('auth.email')]: u.email,
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
        [t('ops.statusLabel')]: s.status,
        [t('ops.answerContent')]: parsePayloadDetail(s),
        [t('ops.submitTime')]: new Date(s.createdAt).toLocaleString()
      }))
      
      const sheet = XLSX.utils.json_to_sheet(rows)
      // 시트명 금지 문자 제거 및 길이 제한 (31자)
      const sheetName = m.title.replace(/[\\/?*[\]]/g, '').slice(0, 25) + `_${m.type.slice(0, 4)}`
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
      {{ $t('ops.statusLabel') || 'Status' }} <strong>{{ camp.status }}</strong> · {{ $t('ops.lotteryMode') }} <strong>{{ camp.lotteryMode }}</strong> · {{ $t('ops.winnerCount') }} <strong>{{ camp.winnerCount }}</strong>{{ $t('common.person') || '名' }}
      <span v-if="camp.totalRewardPoints > 0 || camp.rewardsConfig !== '[]'">
        · {{ $t('ops.totalReward') }} 
        <template v-if="camp.rewardsConfig && camp.rewardsConfig !== '[]'">
          <span v-for="(r, idx) in JSON.parse(camp.rewardsConfig)" :key="idx">
            {{ idx > 0 ? ', ' : '' }}
            <strong>{{ r.amount.toLocaleString() }}</strong>{{ r.currency === 'POINT' ? 'P' : ' ' + r.currency }}
          </span>
        </template>
        <template v-else>
          <strong>{{ camp.totalRewardPoints.toLocaleString() }}</strong>{{ camp.rewardCurrency === 'POINT' ? 'P' : ' ' + camp.rewardCurrency }}
        </template>
      </span>
    </p>
    <div style="display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1rem">
      <button
        type="button"
        class="btn"
        :class="{ primary: tab === 'compose' }"
        @click="openTab('compose')"
      >
        {{ $t('ops.tabSettings') || 'Settings' }}
      </button>
      <button
        type="button"
        class="btn"
        :class="{ primary: tab === 'participants' }"
        @click="openTab('participants')"
      >
        {{ $t('ops.participants') || 'Participants' }}
      </button>
      <button
        type="button"
        class="btn"
        :class="{ primary: tab === 'winners' }"
        @click="openTab('winners')"
      >
        {{ $t('ops.winners') || 'Winners' }}
      </button>
    </div>
    <p v-if="err" class="err">{{ err }}</p>

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

      <template v-if="isDraftLike">
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
          <div v-for="(r, idx) in draftRewards" :key="idx" style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem">
            <input v-model.number="r.amount" type="number" min="0" style="flex: 1" />
            <select v-model="r.currency" style="width: 120px">
              <option value="POINT">{{ $t('common.point') || 'POINT' }}</option>
              <option value="USDT">USDT</option>
              <option value="BRL">BRL (헤알)</option>
              <option value="METAQ">METAQ</option>
            </select>
            <button v-if="draftRewards.length > 1" type="button" class="btn outline" @click="removeDraftReward(idx)">✕</button>
          </div>
          <button type="button" class="btn btn-sm" @click="addDraftReward">+ {{ $t('ops.addReward') || 'Add Reward' }}</button>
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
      </template>

      <button type="button" class="btn primary" style="margin-top: 1rem" :disabled="saving" @click="saveDraft">
        {{ saving ? $t('ops.saving') : $t('ops.saveDraft') }}
      </button>
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
