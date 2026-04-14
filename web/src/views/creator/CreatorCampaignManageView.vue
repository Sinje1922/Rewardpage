<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../../api/client'
import { uploadCompanyLogo } from '../../api/upload'
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
  user: { email: string }
  mission: { title: string }
}

type Stats = {
  submissions: { total: number; approved: number; pending: number; rejected: number }
  winners: number
  byMission: { missionId: string; title: string; approved: number; pending: number; rejected: number }[]
}

type TabId = 'compose' | 'missions' | 'subs' | 'stats' | 'draw'

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
    err.value = '캠페인을 불러오지 못했습니다.'
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
    err.value = '로고 업로드에 실패했습니다. 이미지 형식·용량(2MB 이하)과 로그인을 확인해 주세요.'
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
    err.value = '캠페인 제목을 입력해 주세요.'
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
    err.value = ax.response?.data?.error ?? '저장에 실패했습니다.'
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
    err.value = '미션 추가 실패'
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
    err.value = ax.response?.data?.error ?? '추첨 실패'
  }
}

async function openTab(t: TabId) {
  tab.value = t
  err.value = ''
  if (t === 'subs') await loadSubs()
  if (t === 'stats') await loadStats()
}
</script>

<template>
  <div v-if="camp">
    <div v-if="camp.companyLogoUrl || camp.companyName" style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem">
      <img
        v-if="camp.companyLogoUrl"
        :src="camp.companyLogoUrl"
        alt=""
        style="width: 44px; height: 44px; border-radius: 10px; object-fit: cover; border: 1px solid var(--border)"
      />
      <span v-if="camp.companyName" style="font-weight: 800; color: var(--text-h)">{{ camp.companyName }}</span>
    </div>
    <h1 class="page-title">{{ camp.title }}</h1>
    <p style="color: var(--muted); margin-bottom: 0.75rem">
      상태 <strong>{{ camp.status }}</strong> · 추첨 <strong>{{ camp.lotteryMode }}</strong> · 당첨 <strong>{{ camp.winnerCount }}</strong>명
      <span v-if="camp.totalRewardPoints > 0">
        · 보상 <strong>{{ camp.totalRewardPoints.toLocaleString() }}</strong
        >P (인당 {{ Math.floor(camp.totalRewardPoints / camp.winnerCount).toLocaleString() }}P)
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
        캠페인·미션 편집
      </button>
      <button
        v-if="!isDraftLike"
        type="button"
        class="btn"
        :class="{ primary: tab === 'missions' }"
        @click="openTab('missions')"
      >
        미션 추가
      </button>
      <button type="button" class="btn" :class="{ primary: tab === 'subs' }" @click="openTab('subs')">제출</button>
      <button type="button" class="btn" :class="{ primary: tab === 'stats' }" @click="openTab('stats')">통계</button>
      <button type="button" class="btn" :class="{ primary: tab === 'draw' }" @click="openTab('draw')">추첨</button>
    </div>
    <p v-if="err" class="err">{{ err }}</p>

    <section v-if="tab === 'compose' && isDraftLike" class="card">
      <h2 style="font-size: 1.05rem; color: var(--text-h); margin: 0 0 0.75rem">클라이언트</h2>
      <div class="field">
        <label>회사 이름</label>
        <input v-model="draftCompanyName" />
      </div>
      <div class="field">
        <label>회사 로고</label>
        <div class="logo-row">
          <img v-if="draftCompanyLogo" :src="draftCompanyLogo" alt="" class="logo-preview" />
          <div class="logo-actions">
            <input
              ref="logoFileInput"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
              class="sr-only"
              @change="onDraftLogoFile"
            />
            <button type="button" class="btn" :disabled="logoUploading" @click="logoFileInput?.click()">
              {{ logoUploading ? '업로드 중…' : '파일 선택' }}
            </button>
            <button v-if="draftCompanyLogo" type="button" class="btn" @click="clearDraftLogo">제거</button>
          </div>
        </div>
        <p class="logo-hint">JPEG, PNG, GIF, WebP, SVG · 최대 2MB</p>
      </div>
      <div class="field">
        <label>또는 로고 URL (선택)</label>
        <!-- type=url은 /uploads/... 상대경로를 '유효하지 않은 URL'로 판단하는 브라우저가 있어 text로 둡니다 -->
        <input v-model="draftCompanyLogo" type="text" placeholder="https://… 또는 /uploads/…" />
      </div>

      <h2 style="font-size: 1.05rem; color: var(--text-h); margin: 1.25rem 0 0.75rem">캠페인</h2>
      <div class="field">
        <label>제목</label>
        <input v-model="draftTitle" />
      </div>
      <div class="field">
        <label>설명</label>
        <textarea v-model="draftDescription" rows="3" />
      </div>
      <div class="field">
        <label>당첨 인원</label>
        <input v-model.number="draftWinnerCount" type="number" min="1" />
      </div>
      <div class="field">
        <label>추첨 방식</label>
        <select v-model="draftLotteryMode">
          <option value="SIMPLE">SIMPLE</option>
          <option value="WEIGHTED">WEIGHTED</option>
        </select>
      </div>
      <label style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem">
        <input v-model="draftAutoApprove" type="checkbox" />
        자동 승인
      </label>
      <div class="field">
        <label>총 보상 포인트</label>
        <input v-model.number="draftTotalRewardPoints" type="number" min="0" />
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem">
        <div class="field">
          <label>시작</label>
          <input v-model="draftStartsAt" type="datetime-local" />
        </div>
        <div class="field">
          <label>종료</label>
          <input v-model="draftEndsAt" type="datetime-local" />
        </div>
      </div>

      <h2 style="font-size: 1.05rem; color: var(--text-h); margin: 1.25rem 0 0.75rem">미션</h2>
      <MissionListEditor v-model="missionRows" />

      <button type="button" class="btn primary" style="margin-top: 1rem" :disabled="saving" @click="saveDraft">
        {{ saving ? '저장 중…' : '변경 사항 저장' }}
      </button>
    </section>

    <section v-if="tab === 'missions' && !isDraftLike" class="card">
      <h2 style="font-size: 1.05rem; color: var(--text-h); margin: 0 0 0.75rem">미션 추가</h2>
      <p style="font-size: 0.9rem; color: var(--muted); margin: 0 0 1rem">
        공개된 캠페인은 미션을 하나씩 추가할 수 있습니다. 일괄 수정은 초안 상태에서만 가능합니다.
      </p>
      <div class="field">
        <label>유형</label>
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
        <label>제목</label>
        <input v-model="mTitle" placeholder="예: 웹사이트 방문하기" required />
      </div>
      <div class="field">
        <label>상세 설명 (선택)</label>
        <textarea v-model="mDesc" rows="2" placeholder="미션에 대한 상세 안내를 입력하세요" />
      </div>
      <div class="field">
        <label>표시 순서</label>
        <input v-model.number="mOrder" type="number" />
      </div>

      <div style="margin: 1rem 0; padding: 1rem; background: rgba(0, 0, 0, 0.03); border-radius: 8px; border: 1px dashed var(--border)">
        <h3 style="margin-top: 0; font-size: 0.9rem; color: var(--accent); margin-bottom: 0.75rem">타입별 설정</h3>

        <template v-if="mType === 'LINK_VISIT'">
          <div class="field">
            <label>링크 URL</label>
            <input v-model="cfgLinkUrl" type="url" placeholder="https://..." />
          </div>
          <div class="field">
            <label>최소 체류 시간 (초)</label>
            <input v-model.number="cfgMinDwell" type="number" min="0" />
          </div>
        </template>

        <template v-else-if="mType === 'CODE' || mType === 'SURVEY'">
          <div class="field">
            <label>정답 코드 (선택 가능)</label>
            <input v-model="cfgCorrectCode" type="text" placeholder="사용자가 제출해야 할 코드" />
          </div>
          <div v-if="mType === 'SURVEY'" class="field">
            <label>설문 링크 URL</label>
            <input v-model="cfgLinkUrl" type="url" placeholder="https://..." />
          </div>
          <div v-if="mType === 'SURVEY'" class="field">
            <label>설문 안내 문구</label>
            <textarea v-model="cfgSurveyNote" rows="2" placeholder="설문 완료 후 코드를 확인하라는 등의 안내" />
          </div>
        </template>

        <template v-else-if="mType === 'QUIZ'">
          <div class="field">
            <label>질문</label>
            <input v-model="cfgQuizQuestion" type="text" placeholder="질문을 입력하세요" />
          </div>
          <div class="field">
            <label>보기 설정 (정답을 선택하세요)</label>
            <div
              v-for="(_, idx) in cfgQuizOptions"
              :key="idx"
              style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem"
            >
              <input type="radio" :value="idx" v-model="cfgQuizCorrect" />
              <input v-model="cfgQuizOptions[idx]" type="text" :placeholder="'보기 ' + (idx + 1)" style="flex: 1" />
              <button type="button" class="btn" style="padding: 0.2rem 0.5rem; font-size: 0.8rem" @click="removeQuizOption(idx)">
                삭제
              </button>
            </div>
            <button type="button" class="btn" style="width: 100%; margin-top: 0.25rem" @click="addQuizOption">+ 보기 추가</button>
          </div>
        </template>

        <template v-else-if="mType === 'FILE_UPLOAD'">
          <div class="field">
            <label>업로드 안내문</label>
            <input v-model="cfgFileNote" type="text" placeholder="예: 인증 스크린샷을 업로드해 주세요" />
          </div>
        </template>

        <template v-else-if="mType === 'CHECKIN'">
          <p style="font-size: 0.85rem; color: var(--muted); margin: 0">단순 확인형 미션입니다. 별도의 상세 설정이 필요 없습니다.</p>
        </template>
      </div>
      <button type="button" class="btn primary" @click="addMission">추가</button>

      <h3 style="margin: 1rem 0 0.5rem; font-size: 1rem; color: var(--text-h)">등록된 미션</h3>
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
          <button type="button" class="btn" @click="setSubmission(s.id, 'APPROVED')">승인</button>
          <button type="button" class="btn" @click="setSubmission(s.id, 'REJECTED')">반려</button>
        </div>
      </div>
      <p v-if="!submissions.length" style="color: var(--muted)">제출 없음</p>
    </section>

    <section v-if="tab === 'stats' && stats" class="card">
      <p>총 제출 {{ stats.submissions.total }} / 승인 {{ stats.submissions.approved }} / 대기 {{ stats.submissions.pending }}</p>
      <p>당첨 기록 {{ stats.winners }}</p>
      <ul style="padding-left: 1.1rem">
        <li v-for="b in stats.byMission" :key="b.missionId">{{ b.title }}: 승인 {{ b.approved }}, 대기 {{ b.pending }}</li>
      </ul>
    </section>

    <section v-if="tab === 'draw'" class="card">
      <p>캠페인이 ACTIVE이고 제출이 승인된 뒤 추첨을 실행하세요. SIMPLE은 모든 미션 완료자만, WEIGHTED는 부분 완료자도 티켓이 있습니다.</p>
      <button type="button" class="btn primary" @click="runDraw">추첨 실행</button>
    </section>
  </div>
  <p v-else-if="err && !camp" class="err">{{ err }}</p>
  <p v-else-if="!camp">불러오는 중…</p>
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
