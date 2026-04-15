<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '../../api/client'

type UserRow = { id: string; email: string; role: string; blocked: boolean; pointBalance: number }

const overview = ref<{ users: number; campaigns: number; submissions: number } | null>(null)
const users = ref<UserRow[]>([])
const err = ref('')
const campaignId = ref('')
const userSearchQuery = ref('')

async function refresh() {
  const [o, u] = await Promise.all([
    api.get<{ users: number; campaigns: number; submissions: number }>('/admin/overview'),
    api.get<UserRow[]>('/admin/users', { params: { q: userSearchQuery.value } }),
  ])
  overview.value = o.data
  users.value = u.data
}

onMounted(async () => {
  try {
    await refresh()
  } catch {
    err.value = '관리자 API 접근 실패'
  }
})

async function setRole(id: string, role: UserRow['role']) {
  await api.patch(`/admin/users/${id}/role`, { role })
  await refresh()
}

async function setBlock(id: string, blocked: boolean) {
  await api.patch(`/admin/users/${id}/block`, { blocked })
  await refresh()
}

async function approveCampaign() {
  err.value = ''
  try {
    await api.post(`/admin/campaigns/${campaignId.value}/approve`)
    campaignId.value = ''
    await refresh()
  } catch {
    err.value = '캠페인 승인 실패 (ID 확인)'
  }
}
</script>

<template>
  <div>
    <h1 class="page-title">관리자</h1>
    <p v-if="err" class="err">{{ err }}</p>
    <div v-if="overview" class="card" style="margin-bottom: 1rem">
      <p style="margin: 0">사용자 {{ overview.users }} · 캠페인 {{ overview.campaigns }} · 제출 {{ overview.submissions }}</p>
    </div>

    <h2 style="font-size: 1.1rem; color: var(--text-h)">캠페인 공개 승인 (DRAFT 등 → ACTIVE)</h2>
    <div class="card" style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: flex-end">
      <div class="field" style="margin: 0; flex: 1; min-width: 12rem">
        <label>캠페인 ID</label>
        <input v-model="campaignId" placeholder="cuid…" />
      </div>
      <button type="button" class="btn primary" @click="approveCampaign">승인</button>
    </div>

    <h2 style="font-size: 1.1rem; margin-top: 1.25rem; color: var(--text-h)">사용자</h2>
    
    <div class="search-bar" style="margin-bottom: 1rem">
      <input v-model="userSearchQuery" type="text" placeholder="사용자 이메일 검색..." @keyup.enter="refresh" />
      <button type="button" class="btn" @click="refresh">검색</button>
    </div>

    <div v-for="u in users" :key="u.id" class="card">
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; justify-content: space-between">
        <div style="display: flex; align-items: center; gap: 0.75rem">
          <div>
            <strong>{{ u.email }}</strong>
            <div style="font-size: 0.8rem; color: var(--muted)">{{ u.role }}{{ u.blocked ? ' · 차단됨' : '' }}</div>
          </div>
          <div class="nav-points" style="margin: 0; background: rgba(0,0,0,0.05); border: none">
            <span class="balance" style="font-size: 0.85rem">{{ u.pointBalance.toLocaleString() }}</span>
            <span class="unit" style="font-size: 0.7rem">P</span>
          </div>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 0.35rem">
          <button type="button" class="btn" @click="setRole(u.id, 'USER')">USER</button>
          <button type="button" class="btn" @click="setRole(u.id, 'MANAGER')">MANAGER</button>
          <button type="button" class="btn" @click="setRole(u.id, 'ADMIN')">ADMIN</button>
          <button type="button" class="btn" @click="setBlock(u.id, !u.blocked)">{{ u.blocked ? '차단 해제' : '차단' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nav-points {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.65rem;
  background: var(--accent-soft);
  border-radius: 99px;
}
.balance {
  font-weight: 800;
  color: var(--accent);
}
.unit {
  font-weight: 700;
  color: var(--accent);
  opacity: 0.7;
}
</style>
