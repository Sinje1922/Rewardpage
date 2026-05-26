<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '../../api/client'

type UserRow = { id: string; email: string; role: string; blocked: boolean; pointBalance: number }
type CampaignRow = {
  id: string
  title: string
  status: string
  companyName: string
  createdAt: string
  winnerCount: number
  missions: { id: string }[]
  creator: { id: string; email: string } | null
}
type DashboardData = {
  summary: {
    users: number
    activeCampaigns: number
    totalCampaigns: number
    submissions: number
    totalPoints: number
    avgParticipants: number
    distributedPoints: number
    heldPoints: number
  }
  countries: { name: string; count: number }[]
  ages: { year: number; count: number }[]
  genders: { name: string; count: number }[]
  regions: { name: string; count: number }[]
  history: { month: string; count: number }[]
  topCampaigns: { id: string; title: string; count: number }[]
  topUsers: { id: string; email: string; balance: number }[]
  missionTypes: { type: string; count: number }[]
}

const { t } = useI18n()
const tab = ref<'dashboard' | 'users' | 'campaigns' | 'requests'>('dashboard')
const dashboard = ref<DashboardData | null>(null)
const users = ref<UserRow[]>([])
const campaigns = ref<CampaignRow[]>([])
const managerRequests = ref<any[]>([])
const requestFilter = ref<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')
const adminNote = ref('')
const processingRequestId = ref<string | null>(null)
const err = ref('')
const loading = ref(false)
const userSearchQuery = ref('')
const campaignSearchQuery = ref('')

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

async function loadCampaigns() {
  loading.value = true
  try {
    const { data } = await api.get<CampaignRow[]>('/campaigns')
    campaigns.value = data
  } finally {
    loading.value = false
  }
}

function filteredCampaigns() {
  const q = campaignSearchQuery.value.toLowerCase().trim()
  if (!q) return campaigns.value
  return campaigns.value.filter(c =>
    c.title.toLowerCase().includes(q) ||
    (c.creator?.email ?? '').toLowerCase().includes(q) ||
    c.companyName.toLowerCase().includes(q)
  )
}

function campaignStatusColor(status: string) {
  switch (status) {
    case 'ACTIVE': return '#22c55e'
    case 'DRAFT': return '#f59e0b'
    case 'PENDING_ADMIN': return '#6366f1'
    case 'CLOSED': return '#94a3b8'
    case 'DRAWN': return '#0ea5e9'
    default: return 'var(--muted)'
  }
}

onMounted(async () => {
  try {
    await refresh()
  } catch {
    err.value = t('admin.accessFail')
  }
})

function downloadDashboardCsv() {
  if (!dashboard.value) return
  
  const d = dashboard.value
  let csv = "\uFEFF" // BOM for Excel UTF-8
  
  // 1. Summary
  csv += "--- Summary ---\n"
  csv += "Metric,Value\n"
  csv += `Total Users,${d.summary.users}\n`
  csv += `Active Campaigns,${d.summary.activeCampaigns}\n`
  csv += `Total Campaigns,${d.summary.totalCampaigns}\n`
  csv += `Total Submissions,${d.summary.submissions}\n`
  csv += `Total Points System-wide,${d.summary.totalPoints}\n`
  csv += `Distributed Points,${d.summary.distributedPoints}\n`
  csv += `Held Points,${d.summary.heldPoints}\n`
  csv += `Avg Participants per Campaign,${d.summary.avgParticipants.toFixed(2)}\n\n`
  
  // 2. Top Campaigns
  csv += "--- Top 5 Campaigns ---\n"
  csv += "Rank,ID,Title,Participants\n"
  d.topCampaigns.forEach((c, i) => {
    csv += `${i+1},${c.id},"${c.title.replace(/"/g, '""')}",${c.count}\n`
  })
  csv += "\n"
  
  // 3. Top Users
  csv += "--- Top 5 Users ---\n"
  csv += "Rank,Email,Balance\n"
  d.topUsers.forEach((u, i) => {
    csv += `${i+1},${u.email},${u.balance}\n`
  })
  csv += "\n"
  
  // 4. Mission Types
  csv += "--- Mission Type Distribution ---\n"
  csv += "Type,Count\n"
  d.missionTypes.forEach(m => {
    csv += `${m.type},${m.count}\n`
  })
  csv += "\n"
  
  // 5. Gender
  csv += "--- Gender Distribution ---\n"
  csv += "Gender,Count\n"
  d.genders.forEach(g => {
    csv += `${g.name},${g.count}\n`
  })
  csv += "\n"
  
  // 6. Regions
  csv += "--- Region Distribution ---\n"
  csv += "Region,Count\n"
  d.regions.forEach(r => {
    csv += `${r.name},${r.count}\n`
  })
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `admin_dashboard_report_${new Date().toISOString().slice(0,10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

async function setRole(id: string, role: UserRow['role']) {
  await api.patch(`/admin/users/${id}/role`, { role })
  await refresh()
}

async function setBlock(id: string, blocked: boolean) {
  await api.patch(`/admin/users/${id}/block`, { blocked })
  await refresh()
}

async function loadManagerRequests() {
  loading.value = true
  try {
    const statusParam = requestFilter.value === 'ALL' ? undefined : requestFilter.value
    const { data } = await api.get('/admin/manager-requests', { params: { status: statusParam } })
    managerRequests.value = data
  } catch (e) {
    console.error('Failed to load manager requests:', e)
  } finally {
    loading.value = false
  }
}

async function approveRequest(id: string) {
  if (!confirm('정말로 이 신청을 승인하시겠습니까?\n승인 시 유저 권한이 즉시 MANAGER로 변경됩니다.')) return
  processingRequestId.value = id
  try {
    await api.patch(`/admin/manager-requests/${id}/approve`, { adminNote: adminNote.value || 'Approved' })
    alert('성공적으로 승인되었습니다.')
    adminNote.value = ''
    await loadManagerRequests()
    await refresh()
  } catch (e: any) {
    alert(e.response?.data?.error || '승인에 실패했습니다.')
  } finally {
    processingRequestId.value = null
  }
}

async function rejectRequest(id: string) {
  const reason = prompt('거절 사유를 입력해주세요 (선택):')
  if (reason === null) return
  processingRequestId.value = id
  try {
    await api.patch(`/admin/manager-requests/${id}/reject`, { adminNote: reason || 'Rejected' })
    alert('성공적으로 거절되었습니다.')
    await loadManagerRequests()
  } catch (e: any) {
    alert(e.response?.data?.error || '거절에 실패했습니다.')
  } finally {
    processingRequestId.value = null
  }
}

</script>

<template>
  <div class="admin-container">
    <header class="admin-header">
      <div style="display: flex; align-items: center; gap: 1rem">
        <h1 class="page-title" style="margin: 0">{{ $t('admin.title') }}</h1>
        <button v-if="tab === 'dashboard'" type="button" class="btn btn-sm outline" @click="downloadDashboardCsv">
          {{ $t('admin.exportBtn') }}
        </button>
      </div>
      <div class="tab-group">
        <button class="tab-btn" :class="{ active: tab === 'dashboard' }" @click="tab = 'dashboard'">
          📊 {{ $t('admin.tabDashboard') }}
        </button>
        <button class="tab-btn" :class="{ active: tab === 'users' }" @click="tab = 'users'">
          👥 {{ $t('admin.tabUsers') }}
        </button>
        <button class="tab-btn" :class="{ active: tab === 'campaigns' }" @click="tab = 'campaigns'; loadCampaigns()">
          🗂️ 캠페인 목록
        </button>
        <button class="tab-btn" :class="{ active: tab === 'requests' }" @click="tab = 'requests'; loadManagerRequests()">
          👑 권한 신청
        </button>
      </div>
    </header>

    <p v-if="err" class="err">{{ err }}</p>

    <!-- DASHBOARD TAB -->
    <div v-if="tab === 'dashboard' && dashboard" class="dashboard-content fade-in">
      <div class="stats-grid">
        <div class="stat-card">
          <label>{{ $t('admin.totalUsers') }}</label>
          <div class="value">{{ dashboard.summary.users.toLocaleString() }}</div>
          <div class="trend">{{ $t('admin.thisMonth', { n: dashboard.history[dashboard.history.length-1]?.count || 0 }) }}</div>
        </div>
        <div class="stat-card">
          <label>{{ $t('admin.activeCampaigns') }}</label>
          <div class="value">{{ dashboard.summary.activeCampaigns }} / {{ dashboard.summary.totalCampaigns }}</div>
        </div>
        <div class="stat-card highlight">
          <label>{{ $t('admin.totalPointsAwarded') }}</label>
          <div class="value">{{ dashboard.summary.totalPoints.toLocaleString() }} <small>P</small></div>
        </div>
        <div class="stat-card">
          <label>{{ $t('admin.avgParticipants') }}</label>
          <div class="value">{{ dashboard.summary.avgParticipants.toFixed(1) }}</div>
          <div class="sub">{{ $t('admin.perCampaign') }}</div>
        </div>
        <div class="stat-card">
          <label>💰 {{ $t('admin.distributedPoints') }}</label>
          <div class="value">{{ dashboard.summary.distributedPoints.toLocaleString() }}</div>
          <div class="sub">{{ $t('admin.ofTotal', { p: ((dashboard.summary.distributedPoints / (dashboard.summary.totalPoints || 1)) * 100).toFixed(1) }) }}</div>
        </div>
      </div>

      <div class="charts-grid">
        <!-- Growth Chart -->
        <div class="card chart-card">
          <h3>📈 {{ $t('admin.growthTrend') }}</h3>
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

        <!-- Gender/Region Charts -->
        <div class="card chart-card">
          <h3>👤 {{ $t('admin.genderDist') }}</h3>
          <div class="geo-list">
            <div v-for="g in dashboard.genders" :key="g.name" class="geo-item">
              <span class="name">{{ g.name }}</span>
              <div class="bar-bg">
                <div 
                  class="bar-fill" 
                  :style="{ width: (g.count / Math.max(dashboard.summary.users, 1) * 100) + '%' }"
                ></div>
              </div>
              <span class="count">{{ g.count }}</span>
            </div>
          </div>
        </div>

        <div class="card chart-card">
          <h3>📍 {{ $t('admin.countryDist') }}</h3>
          <div class="geo-list">
            <div v-for="c in dashboard.countries.slice(0, 8)" :key="c.name" class="geo-item">
              <span class="name">{{ c.name }}</span>
              <div class="bar-bg">
                <div 
                  class="bar-fill" 
                  style="background: var(--mint)"
                  :style="{ width: (c.count / Math.max(dashboard.summary.users, 1) * 100) + '%' }"
                ></div>
              </div>
              <span class="count">{{ c.count }}</span>
            </div>
          </div>
        </div>

        <div class="card chart-card">
          <h3>⚡ {{ $t('admin.missionDist') }}</h3>
          <div class="geo-list">
            <div v-for="m in dashboard.missionTypes" :key="m.type" class="geo-item">
              <span class="name" style="width: 100px">{{ m.type }}</span>
              <div class="bar-bg">
                <div 
                  class="bar-fill" 
                  style="background: var(--accent-bright)"
                  :style="{ width: (m.count / Math.max(...dashboard.missionTypes.map(x => x.count), 1) * 100) + '%' }"
                ></div>
              </div>
              <span class="count">{{ m.count }}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Top Performance Section -->
      <div class="charts-grid" style="margin-top: 1.5rem">
        <div class="card">
          <h3 style="margin-bottom: 1rem">🏆 {{ $t('admin.topCampaigns') }}</h3>
          <div class="rank-list">
            <div v-for="(c, i) in dashboard.topCampaigns" :key="c.id" class="rank-item">
              <span class="rank-num">{{ i + 1 }}</span>
              <span class="rank-name">{{ c.title }}</span>
              <span class="rank-value">{{ c.count }}{{ $t('common.participants') }}</span>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 style="margin-bottom: 1rem">👑 {{ $t('admin.topUsers') }}</h3>
          <div class="rank-list">
            <div v-for="(u, i) in dashboard.topUsers" :key="u.id" class="rank-item">
              <span class="rank-num">{{ i + 1 }}</span>
              <span class="rank-name">{{ u.email }}</span>
              <span class="rank-value">{{ u.balance.toLocaleString() }} P</span>
            </div>
          </div>
        </div>
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

    <!-- CAMPAIGNS TAB -->
    <div v-if="tab === 'campaigns'" class="users-content fade-in">
      <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap">
        <input
          v-model="campaignSearchQuery"
          type="text"
          placeholder="캠페인명, 생성자 이메일, 회사명 검색..."
          style="flex: 1; min-width: 200px"
          class="search-input"
        />
        <button type="button" class="btn primary" @click="loadCampaigns">🔄 새로고침</button>
      </div>

      <!-- 요약 카운트 -->
      <div class="campaign-summary">
        <span class="summary-chip">전체 <strong>{{ filteredCampaigns().length }}</strong>개</span>
        <span class="summary-chip active-chip">활성 <strong>{{ filteredCampaigns().filter(c => c.status === 'ACTIVE').length }}</strong></span>
        <span class="summary-chip draft-chip">초안 <strong>{{ filteredCampaigns().filter(c => c.status === 'DRAFT').length }}</strong></span>
        <span class="summary-chip drawn-chip">완료 <strong>{{ filteredCampaigns().filter(c => c.status === 'DRAWN' || c.status === 'CLOSED').length }}</strong></span>
      </div>

      <div v-if="loading" style="text-align: center; padding: 3rem; color: var(--muted)">로딩 중...</div>

      <div v-else-if="filteredCampaigns().length === 0" style="text-align: center; padding: 3rem; color: var(--muted)">
        캠페인이 없습니다.
      </div>

      <div v-else class="campaign-list">
        <div
          v-for="c in filteredCampaigns()"
          :key="c.id"
          class="campaign-card"
        >
          <!-- 상태 뱃지 + 제목 -->
          <div class="campaign-card-header">
            <span class="status-badge" :style="{ background: campaignStatusColor(c.status) + '20', color: campaignStatusColor(c.status), borderColor: campaignStatusColor(c.status) + '40' }">
              {{ c.status }}
            </span>
            <RouterLink :to="`/ops/campaigns/${c.id}`" class="campaign-title-link">
              {{ c.title }}
            </RouterLink>
          </div>

          <!-- 메타 정보 -->
          <div class="campaign-meta">
            <div class="meta-item">
              <span class="meta-label">👤 생성자</span>
              <span class="meta-value creator-email">{{ c.creator?.email ?? '알 수 없음' }}</span>
            </div>
            <div class="meta-item" v-if="c.companyName">
              <span class="meta-label">🏢 회사</span>
              <span class="meta-value">{{ c.companyName }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">🎯 미션</span>
              <span class="meta-value">{{ c.missions?.length ?? 0 }}개</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">🏆 당첨자</span>
              <span class="meta-value">{{ c.winnerCount }}명</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">📅 생성일</span>
              <span class="meta-value">{{ new Date(c.createdAt).toLocaleDateString('ko-KR') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>    <!-- REQUESTS TAB -->
    <div v-if="tab === 'requests'" class="users-content fade-in">
      <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap">
        <select v-model="requestFilter" @change="loadManagerRequests" class="search-input" style="min-width: 150px">
          <option value="ALL">전체 보기</option>
          <option value="PENDING">대기중</option>
          <option value="APPROVED">승인됨</option>
          <option value="REJECTED">거절됨</option>
        </select>
        <button type="button" class="btn primary" @click="loadManagerRequests">🔄 새로고침</button>
      </div>

      <div v-if="loading" style="text-align: center; padding: 3rem; color: var(--muted)">로딩 중...</div>

      <div v-else-if="managerRequests.length === 0" style="text-align: center; padding: 3rem; color: var(--muted)">
        신청 내역이 없습니다.
      </div>

      <div v-else class="campaign-list">
        <div v-for="req in managerRequests" :key="req.id" class="campaign-card" style="display: flex; flex-direction: column; gap: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                <span class="status-badge" :style="{ background: req.status === 'PENDING' ? '#f59e0b20' : (req.status === 'APPROVED' ? '#22c55e20' : '#ef444420'), color: req.status === 'PENDING' ? '#f59e0b' : (req.status === 'APPROVED' ? '#22c55e' : '#ef4444'), borderColor: req.status === 'PENDING' ? '#f59e0b40' : (req.status === 'APPROVED' ? '#22c55e40' : '#ef444440') }">
                  {{ req.status === 'PENDING' ? '대기중' : (req.status === 'APPROVED' ? '승인됨' : '거절됨') }}
                </span>
                <strong style="font-size: 1.1rem; color: var(--text-h)">{{ req.companyName }}</strong>
              </div>
              <div style="font-size: 0.85rem; color: var(--muted); display: flex; flex-wrap: wrap; gap: 1rem;">
                <span>👤 담당자: <strong>{{ req.contactName }}</strong></span>
                <span>📧 이메일: <strong>{{ req.email }}</strong></span>
                <span v-if="req.phone">📞 연락처: <strong>{{ req.phone }}</strong></span>
                <span>💼 업종: <strong>{{ req.businessType }}</strong></span>
                <span>📅 신청일: <strong>{{ new Date(req.createdAt).toLocaleString('ko-KR') }}</strong></span>
              </div>
            </div>

            <!-- Action buttons (Only for PENDING status) -->
            <div v-if="req.status === 'PENDING'" style="display: flex; gap: 0.5rem; align-items: center;">
              <input v-model="adminNote" type="text" placeholder="승인 메모 입력..." class="search-input" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; max-width: 180px;" />
              <button type="button" class="btn btn-sm primary" @click="approveRequest(req.id)" :disabled="processingRequestId === req.id">
                ✅ 승인
              </button>
              <button type="button" class="btn btn-sm danger" @click="rejectRequest(req.id)" :disabled="processingRequestId === req.id">
                ❌ 거절
              </button>
            </div>
          </div>

          <!-- Introduction Message -->
          <div style="background: var(--bg-deep); padding: 1rem; border-radius: 12px; font-size: 0.92rem; color: var(--text); line-height: 1.6; white-space: pre-wrap; border-left: 3px solid var(--accent);">
            {{ req.message }}
          </div>

          <!-- Admin note if processed -->
          <div v-if="req.adminNote" style="font-size: 0.85rem; padding: 0.75rem 1rem; background: rgba(0, 0, 0, 0.02); border-radius: 8px; border-left: 3px solid var(--border);">
            <strong>✍️ 처리 메모:</strong> {{ req.adminNote }}
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

.rank-list { display: flex; flex-direction: column; gap: 0.75rem; }
.rank-item {
  display: flex; align-items: center; gap: 1rem;
  padding: 0.75rem; border-radius: 0.75rem;
  background: var(--bg-deep); transition: all 0.2s;
}
.rank-item:hover { transform: translateX(5px); background: var(--accent-soft); }
.rank-num {
  width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
  background: var(--accent); color: white; border-radius: 50%; font-size: 0.8rem; font-weight: 800;
}
.rank-name { flex: 1; font-weight: 600; font-size: 0.9rem; color: var(--text-h); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rank-value { font-weight: 800; color: var(--accent); font-size: 0.85rem; }

.fade-in {
  animation: fadeIn 0.4s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 900px) {
  .admin-header { flex-direction: column; align-items: stretch; gap: 1rem; }
  .tab-group {
    width: 100%;
    overflow-x: auto;
    white-space: nowrap;
    display: flex;
    -webkit-overflow-scrolling: touch;
    padding: 0.35rem;
    scrollbar-width: none; /* Firefox */
  }
  .tab-group::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }
  .tab-btn {
    flex: 0 0 auto;
    text-align: center;
    padding: 0.5rem 0.85rem;
    font-size: 0.85rem;
  }
  .stats-grid { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
  .charts-grid { grid-template-columns: 1fr; }
}

@media (max-width: 480px) {
  .stats-grid { grid-template-columns: 1fr; }
  .stat-card .value { font-size: 1.5rem; }
}

/* Campaign List Styles */
.campaign-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}
.summary-chip {
  padding: 0.35rem 0.85rem;
  border-radius: 99px;
  font-size: 0.82rem;
  font-weight: 700;
  background: var(--bg-deep);
  color: var(--text);
  border: 1px solid var(--border);
}
.summary-chip strong { color: var(--text-h); }
.summary-chip.active-chip { border-color: #22c55e40; color: #22c55e; background: #22c55e15; }
.summary-chip.draft-chip { border-color: #f59e0b40; color: #f59e0b; background: #f59e0b15; }
.summary-chip.drawn-chip { border-color: #0ea5e940; color: #0ea5e9; background: #0ea5e915; }

.campaign-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.campaign-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 1.25rem;
  padding: 1.25rem 1.5rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.campaign-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.06);
}
.campaign-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}
.status-badge {
  padding: 0.2rem 0.65rem;
  border-radius: 99px;
  font-size: 0.72rem;
  font-weight: 800;
  border: 1px solid;
  white-space: nowrap;
  flex-shrink: 0;
}
.campaign-title-link {
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-h);
  text-decoration: none;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s;
}
.campaign-title-link:hover { color: var(--accent); }
.campaign-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
  margin-bottom: 1rem;
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.meta-label {
  font-size: 0.78rem;
  color: var(--muted);
  font-weight: 600;
}
.meta-value {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text);
}
.meta-value.creator-email {
  color: var(--accent);
  font-weight: 700;
}
.campaign-actions {
  display: flex;
  gap: 0.5rem;
}
.search-input {
  padding: 0.65rem 1rem;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  background: var(--panel);
  color: var(--text);
  font-size: 0.92rem;
  outline: none;
  transition: border-color 0.2s;
}
.search-input:focus { border-color: var(--accent); }
</style>

