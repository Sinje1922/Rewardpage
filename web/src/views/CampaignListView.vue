<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api, getFileUrl } from '../api/client'

type Campaign = {
  id: string
  title: string
  description: string
  companyName: string
  companyLogoUrl: string
  status: string
  winnerCount: number
  totalRewardPoints: number
  startsAt: string | null
  endsAt: string | null
  missions?: { id: string }[]
}

const { t } = useI18n()
const list = ref<Campaign[]>([])
const err = ref('')
const searchQuery = ref('')
const filterStatus = ref('ALL')

onMounted(async () => {
  try {
    const { data } = await api.get<Campaign[]>('/campaigns')
    list.value = data
  } catch {
    err.value = t('campaign.errorLoad')
  }
})

const filteredList = computed(() => {
  const filtered = list.value.filter(c => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (c.companyName && c.companyName.toLowerCase().includes(searchQuery.value.toLowerCase()))
    const matchesStatus = filterStatus.value === 'ALL' || c.status === filterStatus.value
    return matchesSearch && matchesStatus
  })

  const statusScore: Record<string, number> = {
    ACTIVE: 0,
    CLOSED: 1,
    DRAWN: 2,
  }

  return [...filtered].sort((a, b) => {
    const scoreA = statusScore[a.status] ?? 99
    const scoreB = statusScore[b.status] ?? 99
    if (scoreA !== scoreB) return scoreA - scoreB
    return new Date(b.startsAt || 0).getTime() - new Date(a.startsAt || 0).getTime()
  })
})
</script>

<template>
  <div class="list-container">
    <div class="list-head">
      <div class="head-text">
        <h1 class="page-title">{{ $t('campaign.listTitle') }}</h1>
        <p class="lead-text">{{ $t('campaign.listLead') }}</p>
      </div>
      
      <div class="search-wrap">
        <div class="search-bar">
          <input v-model="searchQuery" type="text" :placeholder="$t('campaign.searchPlaceholder')" />
          <select v-model="filterStatus" class="btn filter-select">
            <option value="ALL">{{ $t('campaign.filterAll') }}</option>
            <option value="ACTIVE">{{ $t('campaign.statusActive') }}</option>
            <option value="CLOSED">{{ $t('campaign.statusClosed') }}</option>
            <option value="DRAWN">{{ $t('campaign.statusDrawn') }}</option>
          </select>
        </div>
      </div>
    </div>

    <p v-if="err" class="err">{{ err }}</p>
    
    <div class="grid">
      <div 
        v-for="c in filteredList" 
        :key="c.id" 
        class="card campaign-card"
        :class="{ 'card-inactive': c.status !== 'ACTIVE' }"
      >
        <div class="card-header">
          <div class="badge-row">
            <span class="badge" :class="{ 'badge-active': c.status === 'ACTIVE' }">
              {{ c.status === 'ACTIVE' ? $t('campaign.statusActive') : c.status === 'CLOSED' ? $t('campaign.statusClosed') : $t('campaign.statusDrawn') }}
            </span>
            <span class="mission-count-badge">
              {{ $t('campaign.missionCount', { count: c.missions?.length ?? 0 }) }}
            </span>
          </div>
          <div class="reward-box">
            <div class="total-points">
              💰 {{ $t('campaign.totalReward', { points: (c.totalRewardPoints || 0).toLocaleString() }) }}
            </div>
            <div class="per-person-points">
              {{ $t('campaign.rewardPerPerson', { points: Math.floor((c.totalRewardPoints || 0) / (c.winnerCount || 1)).toLocaleString() }) }}
            </div>
          </div>
        </div>
        
        <RouterLink :to="`/campaigns/${c.id}`" class="card-link">
          <div v-if="c.companyName || c.companyLogoUrl" class="company-info">
            <img v-if="c.companyLogoUrl" :src="getFileUrl(c.companyLogoUrl)" alt="" class="company-mini-logo" />
            <span v-if="c.companyName" class="company-name">{{ c.companyName }}</span>
          </div>
          <h2 class="card-title">{{ c.title }}</h2>
          <p class="card-description">{{ c.description }}</p>
        </RouterLink>

        <div v-if="c.startsAt || c.endsAt" class="period-info">
          📅 {{ $t('campaign.duration', {
            start: c.startsAt ? new Date(c.startsAt).toLocaleDateString() : $t('campaign.durationAlways'),
            end: c.endsAt ? new Date(c.endsAt).toLocaleDateString() : $t('campaign.durationUntilEnd')
          }) }}
        </div>
        
        <div class="card-action">
          <RouterLink 
            :to="`/campaigns/${c.id}`" 
            :class="['btn', c.status === 'ACTIVE' ? 'primary' : '']" 
            class="full-btn"
          >
            {{ c.status === 'ACTIVE' ? $t('campaign.join') : $t('campaign.viewDetail') }}
          </RouterLink>
        </div>
      </div>
    </div>

    <p v-if="!err && filteredList.length === 0" class="empty-msg">
      {{ $t('campaign.noCampaigns') }}
    </p>
  </div>
</template>

<style scoped>
.list-container {
  margin: 0 auto;
}

.list-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2.5rem;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.lead-text {
  color: var(--muted);
  margin: 0.25rem 0 0;
}

.search-wrap {
  flex: 1;
  min-width: 320px;
  max-width: 500px;
}

.filter-select {
  border-radius: 999px;
  padding-right: 2.2rem;
  min-width: 120px;
}

.campaign-card {
  display: flex;
  flex-direction: column;
  min-height: 400px;
}

.card-inactive {
  opacity: 0.75;
  filter: grayscale(0.6);
  background: var(--bg-deep);
}

.card-header {
  margin-bottom: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.badge-active {
  background: var(--mint-soft);
  color: var(--mint);
}

.mission-count-badge {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--muted);
  background: var(--bg-deep);
  padding: 0.25rem 0.6rem;
  border-radius: 0.5rem;
}

.reward-box {
  text-align: right;
}

.total-points {
  font-weight: 900;
  color: var(--accent);
  font-size: 1.3rem;
  line-height: 1;
}

.per-person-points {
  font-size: 0.75rem;
  color: var(--muted);
  margin-top: 0.2rem;
  font-weight: 600;
}

.card-link {
  display: block;
  flex: 1;
  text-decoration: none;
}

.company-info {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.75rem;
}

.company-mini-logo {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid var(--border);
}

.company-name {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--muted);
}

.card-title {
  margin: 0 0 0.6rem;
  font-size: 1.4rem;
  color: var(--text-h);
  line-height: 1.3;
  font-weight: 800;
}

.card-description {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--text);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.period-info {
  font-size: 0.8rem;
  color: var(--muted);
  margin: 1.25rem 0 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 600;
}

.card-action {
  margin-top: 1.5rem;
  width: 100%;
}

.full-btn {
  width: 100%;
}

.empty-msg {
  color: var(--muted);
  text-align: center;
  margin-top: 5rem;
  padding-bottom: 5rem;
  font-weight: 600;
}

@media (max-width: 600px) {
  .list-head {
    flex-direction: column;
    align-items: stretch;
  }
  .search-wrap {
    min-width: 100%;
  }
  .search-bar {
    flex-direction: column;
    gap: 0.75rem;
  }
  .filter-select {
    width: 100%;
  }
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  .reward-box {
    text-align: left;
  }
}
</style>
