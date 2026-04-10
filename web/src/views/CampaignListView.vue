<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '../api/client'

type Campaign = {
  id: string
  title: string
  description: string
  status: string
  winnerCount: number
  totalRewardPoints: number
  startsAt: string | null
  endsAt: string | null
  missions?: { id: string }[]
}

const list = ref<Campaign[]>([])
const err = ref('')
const searchQuery = ref('')
const filterStatus = ref('ALL')

onMounted(async () => {
  try {
    const { data } = await api.get<Campaign[]>('/campaigns')
    list.value = data
  } catch {
    err.value = '목록을 불러오지 못했습니다.'
  }
})

const filteredList = computed(() => {
  return list.value.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
                          c.description.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesStatus = filterStatus.value === 'ALL' || c.status === filterStatus.value
    return matchesSearch && matchesStatus
  })
})
</script>

<template>
  <div style="max-width: 1200px; margin: 0 auto">
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; gap: 1rem; flex-wrap: wrap">
      <div>
        <h1 class="page-title" style="margin-bottom: 0.5rem">모든 캠페인</h1>
        <p style="color: var(--muted); margin: 0">진행 중인 리워드 캠페인을 확인하고 참여해 보세요.</p>
      </div>
      
      <div class="search-bar" style="margin-bottom: 0; min-width: 320px">
        <input v-model="searchQuery" type="text" placeholder="캠페인 제목이나 설명 검색..." />
        <select v-model="filterStatus" class="btn" style="border-radius: 999px; padding-right: 2.2rem">
          <option value="ALL">모든 상태</option>
          <option value="ACTIVE">진행 중</option>
          <option value="CLOSED">종료됨</option>
          <option value="DRAWN">추첨 완료</option>
        </select>
      </div>
    </div>

    <p v-if="err" class="err">{{ err }}</p>
    
    <div class="grid">
      <div v-for="c in filteredList" :key="c.id" class="card" style="display: flex; flex-direction: column; min-height: 380px">
        <div style="margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem">
          <div style="display: flex; flex-wrap: wrap; gap: 0.4rem">
            <span class="badge" :style="c.status === 'ACTIVE' ? 'background: var(--mint-soft); color: var(--mint)' : ''">{{ c.status }}</span>
            <span style="font-size: 0.8rem; font-weight: 600; color: var(--muted); background: var(--bg-deep); padding: 0.25rem 0.6rem; border-radius: 0.5rem">
              미션 {{ c.missions?.length ?? 0 }}
            </span>
          </div>
          <div style="text-align: right">
            <div style="font-weight: 800; color: var(--accent); font-size: 1.25rem; line-height: 1">
              💰 {{ (c.totalRewardPoints || 0).toLocaleString() }}P
            </div>
            <div style="font-size: 0.75rem; color: var(--muted); margin-top: 0.2rem">
              인당 {{ Math.floor((c.totalRewardPoints || 0) / (c.winnerCount || 1)).toLocaleString() }}P
            </div>
          </div>
        </div>
        
        <RouterLink :to="`/campaigns/${c.id}`" style="display: block">
          <h2 style="margin: 0 0 0.50rem; font-size: 1.35rem; color: var(--text-h); line-height: 1.3">{{ c.title }}</h2>
        </RouterLink>

        <div v-if="c.startsAt || c.endsAt" style="font-size: 0.8rem; color: var(--muted); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.4rem">
          📅 {{ c.startsAt ? new Date(c.startsAt).toLocaleDateString() : '언제나' }} ~ {{ c.endsAt ? new Date(c.endsAt).toLocaleDateString() : '종료 시까지' }}
        </div>
        
        <p style="margin: 0; font-size: 0.95rem; line-height: 1.6; color: var(--text); overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; flex: 1">
          {{ c.description }}
        </p>

        <div style="margin-top: 1.75rem; width: 100%">
          <RouterLink :to="`/campaigns/${c.id}`" class="btn primary" style="width: 100%; box-sizing: border-box; display: flex">
            참여하기
          </RouterLink>
        </div>
      </div>
    </div>

    <p v-if="!err && filteredList.length === 0" style="color: var(--muted); text-align: center; margin-top: 5rem; padding-bottom: 5rem">
      조건에 맞는 캠페인이 없습니다.
    </p>
  </div>
</template>
