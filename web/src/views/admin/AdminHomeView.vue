<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '../../api/client'

type UserRow = { id: string; email: string; role: string; blocked: boolean; pointBalance: number }
type DashboardData = {
  summary: {
    users: number
    activeCampaigns: number
    totalCampaigns: number
    submissions: number
    totalPoints: number
    avgParticipants: number
  }
  countries: { name: string; count: number }[]
  ages: { year: number; count: number }[]
  history: { month: string; count: number }[]
}

const { t } = useI18n()
const tab = ref<'dashboard' | 'users'>('dashboard')
const dashboard = ref<DashboardData | null>(null)
const users = ref<UserRow[]>([])
const err = ref('')
const loading = ref(false)
const campaignId = ref('')
const userSearchQuery = ref('')

async function refresh() {
  loading.value = true
  try {
    const [u, d] = await Promise.all([
      api.get<UserRow[]>('/admin/users', { params: { q: userSearchQuery.value } }),
      api.get<DashboardData>('/admin/dashboard'),
    ])
    users.value = u.data
    dashboard.value = d.data
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    await refresh()
  } catch {
    err.value = t('admin.accessFail')
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
    err.value = t('admin.approveFail')
  }
}
</script>

<template>
  <div class="admin-container">
    <header class="admin-header">
      <h1 class="page-title">{{ $t('admin.title') }}</h1>
      <div class="tab-group">
        <button class="tab-btn" :class="{ active: tab === 'dashboard' }" @click="tab = 'dashboard'">
          📊 {{ $t('admin.tabDashboard') || '대시보드' }}
        </button>
        <button class="tab-btn" :class="{ active: tab === 'users' }" @click="tab = 'users'">
          👥 {{ $t('admin.tabUsers') || '유저 관리' }}
        </button>
      </div>
    </header>

    <p v-if="err" class="err">{{ err }}</p>

    <!-- DASHBOARD TAB -->
    <div v-if="tab === 'dashboard' && dashboard" class="dashboard-content fade-in">
      <div class="stats-grid">
        <div class="stat-card">
          <label>{{ $t('admin.totalUsers') || '누적 사용자' }}</label>
          <div class="value">{{ dashboard.summary.users.toLocaleString() }}</div>
          <div class="trend">+{{ dashboard.history[dashboard.history.length-1]?.count || 0 }} this month</div>
        </div>
        <div class="stat-card">
          <label>{{ $t('admin.activeCampaigns') || '활성 캠페인' }}</label>
          <div class="value">{{ dashboard.summary.activeCampaigns }} / {{ dashboard.summary.totalCampaigns }}</div>
        </div>
        <div class="stat-card highlight">
          <label>{{ $t('admin.totalPointsAwarded') || '지급된 총 포인트' }}</label>
          <div class="value">{{ dashboard.summary.totalPoints.toLocaleString() }} <small>P</small></div>
        </div>
        <div class="stat-card">
          <label>{{ $t('admin.avgParticipants') || '평균 참여도' }}</label>
          <div class="value">{{ dashboard.summary.avgParticipants.toFixed(1) }}</div>
          <div class="sub">{{ $t('admin.perCampaign') || '인/캠페인' }}</div>
        </div>
      </div>

      <div class="charts-grid">
        <!-- Growth Chart -->
        <div class="card chart-card">
          <h3>📈 {{ $t('admin.growthTrend') || '사용자 성장 추이' }}</h3>
          <div class="chart-container">
            <svg viewBox="0 0 400 150" class="line-chart">
              <path
                v-if="dashboard.history.length"
                :d="generateLinePath(dashboard.history)"
                fill="none"
                stroke="var(--accent)"
                stroke-width="3"
                stroke-linecap="round"
              />
              <g class="points">
                <circle
                  v-for="(h, i) in dashboard.history"
                  :key="i"
                  :cx="i * (400 / (dashboard.history.length - 1 || 1))"
                  :cy="150 - (h.count / Math.max(...dashboard.history.map(x => x.count), 1) * 120)"
                  r="4"
                  fill="var(--accent)"
                />
              </g>
            </svg>
            <div class="chart-labels">
              <span v-for="h in dashboard.history" :key="h.month">{{ h.month.slice(5) }}</span>
            </div>
          </div>
        </div>

        <!-- Geo Distribution -->
        <div class="card chart-card">
          <h3>🌍 {{ $t('admin.geoDist') || '국가별 분포' }}</h3>
          <div class="geo-list">
            <div v-for="c in dashboard.countries.slice(0, 5)" :key="c.name" class="geo-item">
              <span class="flag">{{ getFlag(c.name) }}</span>
              <span class="name">{{ c.name }}</span>
              <div class="bar-bg">
                <div 
                  class="bar-fill" 
                  :style="{ width: (c.count / dashboard.summary.users * 100) + '%' }"
                ></div>
              </div>
              <span class="count">{{ c.count }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Approval Section (Original functionality) -->
      <h2 style="font-size: 1.1rem; color: var(--text-h); margin-top: 2rem">{{ $t('admin.campaignApproveTitle') }}</h2>
      <div class="card" style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: flex-end">
        <div class="field" style="margin: 0; flex: 1; min-width: 12rem">
          <label>{{ $t('admin.campaignIdLabel') }}</label>
          <input v-model="campaignId" placeholder="cuid…" />
        </div>
        <button type="button" class="btn primary" @click="approveCampaign">{{ $t('ops.approve') || 'Approve' }}</button>
      </div>
    </div>

    <!-- USERS TAB -->
    <div v-if="tab === 'users'" class="users-content fade-in">
      <div class="search-bar" style="margin-bottom: 1.5rem">
        <input v-model="userSearchQuery" type="text" :placeholder="t('admin.userSearchPlaceholder')" @keyup.enter="refresh" />
        <button type="button" class="btn primary" @click="refresh">{{ $t('admin.searchBtn') }}</button>
      </div>

      <div class="user-list">
        <div v-for="u in users" :key="u.id" class="card user-item">
          <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; justify-content: space-between">
            <div style="display: flex; align-items: center; gap: 0.75rem">
              <div class="avatar-stub">{{ u.email[0].toUpperCase() }}</div>
              <div>
                <strong>{{ u.email }}</strong>
                <div style="font-size: 0.8rem; color: var(--muted)">{{ u.role }}{{ u.blocked ? $t('admin.blockedLabel') : '' }}</div>
              </div>
              <div class="nav-points small">
                <span class="balance">{{ u.pointBalance.toLocaleString() }}</span>
                <span class="unit">P</span>
              </div>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 0.35rem">
              <button type="button" class="btn btn-sm" :class="{ outline: u.role !== 'USER' }" @click="setRole(u.id, 'USER')">USER</button>
              <button type="button" class="btn btn-sm" :class="{ outline: u.role !== 'MANAGER' }" @click="setRole(u.id, 'MANAGER')">MANAGER</button>
              <button type="button" class="btn btn-sm" :class="{ outline: u.role !== 'ADMIN' }" @click="setRole(u.id, 'ADMIN')">ADMIN</button>
              <button type="button" class="btn btn-sm danger" @click="setBlock(u.id, !u.blocked)">
                {{ u.blocked ? $t('admin.unblockBtn') : $t('admin.blockBtn') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
function generateLinePath(history: { count: number }[]) {
  if (history.length < 2) return ""
  const max = Math.max(...history.map(h => h.count), 1)
  const width = 400
  const height = 150
  const step = width / (history.length - 1)
  
  return history.map((h, i) => {
    const x = i * step
    const y = height - (h.count / max * 120) // Leave some padding
    return (i === 0 ? "M" : "L") + `${x},${y}`
  }).join(" ")
}

function getFlag(country: string) {
  const flags: Record<string, string> = {
    'KR': '🇰🇷', 'US': '🇺🇸', 'JP': '🇯🇵', 'CN': '🇨🇳', 'BR': '🇧🇷', 'Unknown': '🏳️'
  }
  return flags[country] || '🏳️'
}
</script>

<style scoped>
.admin-container {
  max-width: 1200px;
  margin: 0 auto;
}
.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}
.tab-group {
  display: flex;
  background: var(--bg-deep);
  padding: 0.4rem;
  border-radius: 1rem;
  gap: 0.25rem;
}
.tab-btn {
  padding: 0.5rem 1.25rem;
  border: none;
  background: transparent;
  color: var(--muted);
  font-weight: 700;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}
.tab-btn.active {
  background: var(--panel);
  color: var(--accent);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
}
.stat-card {
  background: var(--panel);
  padding: 1.5rem;
  border-radius: 1.25rem;
  border: 1px solid var(--border);
  transition: transform 0.2s ease;
}
.stat-card:hover {
  transform: translateY(-4px);
}
.stat-card.highlight {
  border-color: var(--accent-border);
  background: linear-gradient(135deg, var(--panel) 0%, var(--accent-soft) 100%);
}
.stat-card label {
  display: block;
  font-size: 0.85rem;
  color: var(--muted);
  margin-bottom: 0.5rem;
}
.stat-card .value {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-h);
}
.stat-card .trend {
  font-size: 0.8rem;
  color: var(--mint);
  margin-top: 0.25rem;
  font-weight: 600;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}
.chart-card h3 {
  margin: 0 0 1.25rem;
  font-size: 1rem;
  color: var(--text-h);
}
.chart-container {
  height: 200px;
  position: relative;
}
.line-chart {
  width: 100%;
  height: 150px;
  overflow: visible;
}
.chart-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: var(--muted);
  margin-top: 0.5rem;
}

.geo-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.geo-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.geo-item .flag { font-size: 1.2rem; }
.geo-item .name { flex: 1; font-size: 0.9rem; font-weight: 600; width: 60px; }
.geo-item .bar-bg { flex: 3; height: 8px; background: var(--bg-deep); border-radius: 4px; overflow: hidden; }
.geo-item .bar-fill { height: 100%; background: var(--accent); border-radius: 4px; }
.geo-item .count { font-size: 0.85rem; font-weight: 700; color: var(--muted); width: 30px; text-align: right; }

.user-item {
  margin-bottom: 0.75rem;
}
.avatar-stub {
  width: 36px;
  height: 36px;
  background: var(--accent-bright);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: 800;
}
.nav-points.small {
  padding: 0.2rem 0.6rem;
  font-size: 0.8rem;
  background: var(--accent-soft);
  border-radius: 99px;
}
.nav-points .balance { font-weight: 800; color: var(--accent); }
.nav-points .unit { font-size: 0.7rem; color: var(--accent); opacity: 0.7; }

.fade-in {
  animation: fadeIn 0.4s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 600px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
