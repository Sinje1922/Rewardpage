<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api/client'
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
  FILE_UPLOAD: '📁'
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
const checkConfirm = ref<Record<string, boolean>>({})

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
    if (['DRAWN', 'CLOSED', 'ACTIVE'].includes(data.status)) {
      try {
        const w = await api.get<WinnerRow[]>(`/campaigns/${id}/winners`)
        winners.value = w.data
      } catch {
        /* ignore */
      }
    }
    
    await loadParticipants()
  } catch {
    err.value = '캠페인을 불러오지 못했습니다.'
  }
})

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
  } else if (m.type === 'CODE' || m.type === 'SURVEY') {
    payload = { code: codeInput.value[m.id] ?? '' }
  } else if (m.type === 'QUIZ') {
    payload = { selectedIndex: quizPick.value[m.id] }
  } else if (m.type === 'CHECKIN') {
    if (!checkConfirm.value[m.id]) {
      err.value = '확인에 체크해 주세요.'
      return
    }
    payload = {}
  } else if (m.type === 'FILE_UPLOAD') {
    payload = { fileUrl: codeInput.value[m.id] ?? '' }
  }
  try {
    await api.post(`/missions/${m.id}/submit`, { payload })
    msg.value = '제출되었습니다.'
    const { data } = await api.get<CampaignDetail>(`/campaigns/${route.params.id}`)
    camp.value = data
    await loadParticipants()
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { error?: string } } }
    err.value = ax.response?.data?.error ?? '제출에 실패했습니다.'
  }
}

const sortedMissions = computed(() => [...(camp.value?.missions ?? [])].sort((a, b) => a.sortOrder - b.sortOrder))
</script>

<template>
  <div v-if="camp">
    <div style="margin-bottom: 2.5rem; text-align: center">
      <h1 class="page-title">{{ camp.title }}</h1>
      <p style="margin: 0 auto 1rem; max-width: 36rem; line-height: 1.6">{{ camp.description }}</p>
      <div style="display: flex; gap: 0.75rem; justify-content: center; align-items: center">
        <span class="badge">상태: {{ camp.status }}</span>
        <span v-if="camp.missions" style="font-size: 0.9rem; color: var(--muted)">미션 {{ camp.missions.length }}개</span>
        <span v-if="camp.totalRewardPoints > 0" class="badge" style="background: var(--accent); color: white">
          💰 {{ camp.totalRewardPoints.toLocaleString() }}P 보상
        </span>
        <button type="button" class="btn" style="padding: 0.35rem 0.8rem; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem; border-radius: 99px" @click="copyLink">
          🔗 {{ showCopyMsg ? '복사됨!' : '공유하기' }}
        </button>
      </div>
      <p v-if="camp.totalRewardPoints > 0" style="font-size: 0.85rem; color: var(--muted); margin-top: 0.5rem">
        당첨 시 인당 {{ Math.floor(camp.totalRewardPoints / camp.winnerCount).toLocaleString() }}P 지급
      </p>
      <div v-if="camp.startsAt || camp.endsAt" style="margin-top: 0.75rem; font-size: 0.9rem; color: var(--muted); font-weight: 600">
        📅 기간: {{ camp.startsAt ? new Date(camp.startsAt).toLocaleString() : '상시 진행' }} ~ {{ camp.endsAt ? new Date(camp.endsAt).toLocaleString() : '종료 시까지' }}
      </div>
    </div>

    <section v-if="winners.length" class="card" style="margin-bottom: 2rem; border-style: dashed; background: var(--accent-soft)">
      <h2 style="font-size: 1.1rem; margin: 0 0 0.75rem; color: var(--text-h)">🏆 이번 캠페인 당첨자</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem">
        <div v-for="w in winners" :key="w.rank" style="font-weight: 600; font-size: 0.95rem">
          {{ w.rank }}위 — {{ w.user.email }} 
          <span v-if="w.points > 0" style="color: var(--accent)">({{ w.points.toLocaleString() }}P)</span>
        </div>
      </div>
    </section>

    <p v-if="msg" style="color: var(--mint); font-weight: 700; text-align: center; margin-bottom: 1rem">{{ msg }}</p>
    <p v-if="err" class="err" style="text-align: center; margin-bottom: 1rem">{{ err }}</p>

    <div class="grid">
      <div v-for="m in sortedMissions" :key="m.id" class="card" :class="{ completed: myStatus(m.id) === 'APPROVED' }">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem">
          <div style="display: flex; gap: 0.5rem; align-items: center">
            <span style="font-size: 1.5rem">{{ typeIcons[m.type] || '✨' }}</span>
            <span v-if="camp.totalRewardPoints > 0" style="font-size: 0.85rem; font-weight: 700; color: var(--accent); background: var(--accent-soft); padding: 0.2rem 0.6rem; border-radius: 99px">
              {{ Math.floor(camp.totalRewardPoints / camp.winnerCount).toLocaleString() }}P 대기
            </span>
          </div>
          <span class="badge" :style="myStatus(m.id) === 'APPROVED' ? 'background: var(--mint); color: white' : ''">
            {{ myStatus(m.id) ?? '미참여' }}
          </span>
        </div>

        <h2 style="font-size: 1.15rem; margin: 0 0 0.5rem; color: var(--text-h)">{{ m.title }}</h2>
        <p style="margin: 0 0 1rem; font-size: 0.9rem; color: var(--text); min-height: 2.7rem; line-height: 1.4">
          {{ m.description }}
        </p>

        <div style="border-top: 1px solid var(--border); padding-top: 1rem; margin-top: auto">
          <template v-if="m.type === 'LINK_VISIT'">
            <button type="button" class="btn" style="width: 100%" @click="logVisit(m)">링크 열기</button>
            <div class="field" style="margin-top: 0.75rem">
              <label>체류 시간(초) 확인</label>
              <input v-model.number="dwellInput[m.id]" type="number" min="0" placeholder="0" />
            </div>
          </template>

          <template v-else-if="m.type === 'CODE' || m.type === 'SURVEY'">
            <div v-if="m.type === 'SURVEY' && parseCfg(m.config).linkUrl" style="margin-bottom: 1.25rem">
              <button type="button" class="btn primary" style="width: 100%; border-radius: 12px; height: 3rem" @click="logVisit(m)">
                📋 설문 응답하기
              </button>
            </div>
            <div v-if="m.type === 'SURVEY' && parseCfg(m.config).surveyNote" style="font-size: 0.85rem; color: var(--muted); margin-bottom: 1rem; border-left: 3px solid var(--border); padding-left: 0.75rem">
              {{ parseCfg(m.config).surveyNote }}
            </div>
            <div class="field">
              <label>{{ m.type === 'CODE' ? '정답 코드' : '설문 확인 코드' }}</label>
              <input v-model="codeInput[m.id]" type="text" placeholder="코드를 입력하세요" style="width: 100%; box-sizing: border-box" />
            </div>
          </template>

          <template v-else-if="m.type === 'QUIZ'">
            <p style="margin: 0 0 0.75rem; font-weight: 600; font-size: 0.95rem">{{ String(parseCfg(m.config).quizQuestion ?? '') }}</p>
            <div
              v-for="(opt, idx) in (parseCfg(m.config).quizOptions as string[] | undefined) ?? []"
              :key="idx"
              class="field"
              style="flex-direction: row; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem"
            >
              <input :id="'q-' + m.id + '-' + idx" v-model.number="quizPick[m.id]" type="radio" :value="idx" />
              <label :for="'q-' + m.id + '-' + idx" style="margin: 0; font-weight: 400">{{ opt }}</label>
            </div>
          </template>

          <template v-else-if="m.type === 'CHECKIN'">
            <label style="display: flex; gap: 0.5rem; align-items: center; cursor: pointer">
              <input v-model="checkConfirm[m.id]" type="checkbox" />
              <span style="font-size: 0.9rem">이해했습니다</span>
            </label>
          </template>

          <template v-else-if="m.type === 'FILE_UPLOAD'">
            <div class="field">
              <label>파일 URL</label>
              <input v-model="codeInput[m.id]" type="url" placeholder="https://..." style="width: 100%; box-sizing: border-box" />
            </div>
          </template>

          <button
            v-if="camp.status === 'ACTIVE'"
            type="button"
            class="btn primary"
            style="margin-top: 1.25rem; width: 100%; height: 3.2rem; font-size: 1rem; border-radius: 14px"
            @click="submitMission(m)"
          >
            미션 완료 및 제출
          </button>
        </div>
      </div>
    </div>
    
    <div class="card" style="margin-top: 3rem; background: var(--bg-deep); border: 2px solid var(--border)">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem">
        <h2 style="font-size: 1.25rem; margin: 0; color: var(--text-h)">👥 실시간 참여 현황</h2>
        <span class="badge" style="background: var(--accent); color: white; padding: 0.4rem 1rem">총 {{ participantCount }}명 완료</span>
      </div>
      
      <div v-if="participants.length > 0" style="display: flex; flex-wrap: wrap; gap: 0.75rem">
        <div 
          v-for="(p, idx) in participants" 
          :key="idx" 
          style="font-size: 0.85rem; padding: 0.4rem 0.75rem; background: var(--panel); border-radius: 0.5rem; border: 1px solid var(--border); color: var(--muted)"
        >
          {{ p.email }}
        </div>
      </div>
      <div v-else style="padding: 2rem; text-align: center; color: var(--muted); background: var(--panel); border-radius: 12px; border: 1px dashed var(--border)">
        <p style="margin: 0; font-size: 0.95rem">아직 미션을 모두 완료한 참가자가 없습니다.</p>
        <p style="margin: 0.5rem 0 0; font-size: 0.85rem">가장 먼저 모든 미션을 완료하고 행운의 주인공이 되어보세요! ✨</p>
      </div>

      <p style="margin-top: 1.25rem; font-size: 0.8rem; color: var(--muted); text-align: center">
        모든 미션을 완료한 사용자만 목록에 표시됩니다.
      </p>
    </div>
  </div>
  <p v-else-if="!err">불러오는 중…</p>
  <p v-else class="err">{{ err }}</p>
</template>

<style scoped>
.completed {
  border-color: var(--mint);
  background: color-mix(in srgb, var(--panel) 95%, var(--mint-soft));
}
</style>
