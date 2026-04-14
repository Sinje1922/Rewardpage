<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../../api/client'
import { uploadCompanyLogo } from '../../api/upload'
import MissionListEditor from '../../components/ops/MissionListEditor.vue'
import { emptyMissionRow, rowToPayload, validateRows, type MissionRowState } from '../../utils/missionRow'

const router = useRouter()
const companyName = ref('')
const companyLogoUrl = ref('')
const title = ref('')
const description = ref('')
const winnerCount = ref(1)
const lotteryMode = ref<'SIMPLE' | 'WEIGHTED'>('SIMPLE')
const autoApprove = ref(true)
const totalRewardPoints = ref(0)
const startsAt = ref('')
const endsAt = ref('')
const missionRows = ref<MissionRowState[]>([emptyMissionRow(0)])
const err = ref('')

const logoUploading = ref(false)
const logoFileInput = ref<HTMLInputElement | null>(null)

async function onLogoFile(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  err.value = ''
  logoUploading.value = true
  try {
    companyLogoUrl.value = await uploadCompanyLogo(file)
  } catch {
    err.value = '로고 업로드에 실패했습니다. 운영자로 로그인했는지, 이미지 형식·용량(2MB 이하)을 확인해 주세요.'
  } finally {
    logoUploading.value = false
    input.value = ''
  }
}

function clearLogo() {
  companyLogoUrl.value = ''
}

async function save() {
  err.value = ''
  const v = validateRows(missionRows.value)
  if (v) {
    err.value = v
    return
  }
  if (!title.value.trim()) {
    err.value = '캠페인 제목을 입력해 주세요.'
    return
  }
  const missions = missionRows.value.map((r, i) => rowToPayload(r, i))
  try {
    const { data } = await api.post<{ id: string }>('/campaigns', {
      title: title.value.trim(),
      description: description.value,
      companyName: companyName.value.trim(),
      companyLogoUrl: companyLogoUrl.value.trim(),
      winnerCount: winnerCount.value,
      lotteryMode: lotteryMode.value,
      autoApprove: autoApprove.value,
      totalRewardPoints: totalRewardPoints.value,
      startsAt: startsAt.value ? new Date(startsAt.value).toISOString() : null,
      endsAt: endsAt.value ? new Date(endsAt.value).toISOString() : null,
      missions,
    })
    await router.replace(`/ops/campaigns/${data.id}`)
  } catch {
    err.value = '저장에 실패했습니다. 운영자 권한과 미션 입력을 확인해 주세요.'
  }
}
</script>

<template>
  <div>
    <h1 class="page-title">캠페인 · 미션 만들기</h1>
    <p style="color: var(--muted); margin: 0 0 1rem; max-width: 40rem">
      클라이언트(회사) 정보와 캠페인 설정, 미션을 한 번에 구성합니다. 저장 후에도 초안 상태면 계속 수정할 수 있어요.
    </p>

    <form class="stack" @submit.prevent="save">
      <section class="card">
        <h2 class="section-title">클라이언트 (수주사)</h2>
        <div class="field">
          <label>회사 이름</label>
          <input v-model="companyName" placeholder="예: ○○ 주식회사" />
        </div>
        <div class="field">
          <label>회사 로고</label>
          <div class="logo-row">
            <img v-if="companyLogoUrl" :src="companyLogoUrl" alt="" class="logo-preview" />
            <div class="logo-actions">
              <input
                ref="logoFileInput"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                class="sr-only"
                @change="onLogoFile"
              />
              <button type="button" class="btn" :disabled="logoUploading" @click="logoFileInput?.click()">
                {{ logoUploading ? '업로드 중…' : '파일 선택' }}
              </button>
              <button v-if="companyLogoUrl" type="button" class="btn" @click="clearLogo">제거</button>
            </div>
          </div>
          <p class="hint">JPEG, PNG, GIF, WebP, SVG · 최대 2MB</p>
        </div>
        <div class="field">
          <label>또는 로고 URL (선택)</label>
          <!-- type=url은 /uploads/... 상대경로를 '유효하지 않은 URL'로 판단하는 브라우저가 있어 text로 둡니다 -->
          <input v-model="companyLogoUrl" type="text" placeholder="https://… 또는 /uploads/…" />
        </div>
      </section>

      <section class="card">
        <h2 class="section-title">캠페인</h2>
        <div class="field">
          <label>캠페인 제목</label>
          <input v-model="title" required />
        </div>
        <div class="field">
          <label>설명</label>
          <textarea v-model="description" rows="3" />
        </div>
        <div class="field">
          <label>당첨 인원</label>
          <input v-model.number="winnerCount" type="number" min="1" required />
        </div>
        <div class="field">
          <label>추첨 방식</label>
          <select v-model="lotteryMode">
            <option value="SIMPLE">단순 (전체 완료자 중 추첨)</option>
            <option value="WEIGHTED">가중치 (완료 미션 수만큼 티켓)</option>
          </select>
        </div>
        <label style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 1rem">
          <input v-model="autoApprove" type="checkbox" />
          자동 승인 (검증 통과 시 APPROVED)
        </label>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem">
          <div class="field">
            <label>시작 일시 (선택)</label>
            <input v-model="startsAt" type="datetime-local" />
          </div>
          <div class="field">
            <label>종료 일시 (선택)</label>
            <input v-model="endsAt" type="datetime-local" />
          </div>
        </div>

        <div class="field reward-box">
          <label>총 보상 포인트</label>
          <input v-model.number="totalRewardPoints" type="number" min="0" step="100" placeholder="예: 1000" />
          <p v-if="winnerCount > 0" class="reward-hint">
            당첨자 1인당 약 <strong>{{ Math.floor(totalRewardPoints / winnerCount) }}</strong> 포인트
          </p>
        </div>
      </section>

      <section class="card">
        <h2 class="section-title">미션 구성</h2>
        <MissionListEditor v-model="missionRows" />
      </section>

      <p v-if="err" class="err">{{ err }}</p>
      <button class="btn primary" type="submit">캠페인·미션 저장</button>
    </form>
  </div>
</template>

<style scoped>
.stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 40rem;
}
.section-title {
  font-size: 1.05rem;
  margin: 0 0 0.75rem;
  color: var(--text-h);
}
.reward-box {
  padding: 1rem;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  border: 1px dashed var(--accent-border);
}
.reward-hint {
  margin: 0.35rem 0 0;
  font-size: 0.9rem;
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
.hint {
  margin: 0.35rem 0 0;
  font-size: 0.82rem;
  color: var(--muted);
}
</style>

