<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../../api/client'

const router = useRouter()
const title = ref('')
const description = ref('')
const winnerCount = ref(1)
const lotteryMode = ref<'SIMPLE' | 'WEIGHTED'>('SIMPLE')
const autoApprove = ref(true)
const totalRewardPoints = ref(0)
const startsAt = ref('')
const endsAt = ref('')
const err = ref('')

async function save() {
  err.value = ''
  try {
    const { data } = await api.post<{ id: string }>('/campaigns', {
      title: title.value,
      description: description.value,
      winnerCount: winnerCount.value,
      lotteryMode: lotteryMode.value,
      autoApprove: autoApprove.value,
      totalRewardPoints: totalRewardPoints.value,
      startsAt: startsAt.value ? new Date(startsAt.value).toISOString() : null,
      endsAt: endsAt.value ? new Date(endsAt.value).toISOString() : null,
    })
    await router.replace(`/ops/campaigns/${data.id}`)
  } catch {
    err.value = '운영자(관리자·매니저)만 캠페인을 만들 수 있습니다.'
  }
}
</script>

<template>
  <div>
    <h1 class="page-title">캠페인 만들기</h1>
    <form class="card" style="max-width: 28rem" @submit.prevent="save">
      <div class="field">
        <label>제목</label>
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

      <div class="field" style="margin-top: 1.5rem; padding: 1.25rem; background: var(--accent-soft); border-radius: 1rem; border: 1px dashed var(--accent-border)">
        <label style="color: var(--accent); font-weight: 700">총 보상 포인트</label>
        <input v-model.number="totalRewardPoints" type="number" min="0" step="100" placeholder="예: 1000" style="margin-bottom: 0.5rem" />
        <p v-if="winnerCount > 0" style="font-size: 0.9rem; color: var(--text); font-weight: 600">
          💰 당첨자 1인당 <strong>{{ Math.floor(totalRewardPoints / winnerCount) }}</strong> 포인트 지급 예정
        </p>
      </div>
      <p v-if="err" class="err">{{ err }}</p>
      <button class="btn primary" type="submit">저장 후 미션 편집</button>
    </form>
  </div>
</template>
