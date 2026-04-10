<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '../../api/client'

type Campaign = { id: string; title: string; status: string; missions?: { id: string }[] }

const list = ref<Campaign[]>([])
const err = ref('')

onMounted(async () => {
  try {
    const { data } = await api.get<Campaign[]>('/campaigns')
    list.value = data
  } catch {
    err.value = '목록을 불러오지 못했습니다.'
  }
})
</script>

<template>
  <div>
    <h1 class="page-title">운영 콘솔</h1>
    <p style="color: var(--muted); margin: 0 0 0.75rem; font-size: 0.95rem">
      캠페인·미션은 운영자(관리자·매니저)만 만들 수 있습니다.
    </p>
    <RouterLink class="btn primary" to="/ops/campaigns/new">새 캠페인</RouterLink>
    <p v-if="err" class="err" style="margin-top: 1rem">{{ err }}</p>
    <div v-for="c in list" :key="c.id" class="card" style="margin-top: 0.75rem">
      <RouterLink :to="`/ops/campaigns/${c.id}`">
        <strong style="color: var(--text-h)">{{ c.title }}</strong>
      </RouterLink>
      <p style="margin: 0.35rem 0 0; font-size: 0.9rem; color: var(--muted)">
        {{ c.status }} · 미션 {{ c.missions?.length ?? 0 }}개
      </p>
    </div>
  </div>
</template>
