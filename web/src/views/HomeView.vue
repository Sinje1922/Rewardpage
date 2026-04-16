<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { api, getFileUrl } from '../api/client'
import { useI18n } from 'vue-i18n'

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
const loading = ref(true)

onMounted(async () => {
  try {
    const { data } = await api.get<Campaign[]>('/campaigns')
    list.value = data.filter(c => c.status === 'ACTIVE')
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
})

// 마감 임박 (종료 시간이 있고 미래인 것 중 빠른 순)
const closingSoonList = computed(() => {
  return [...list.value]
    .filter(c => c.endsAt && new Date(c.endsAt) > new Date())
    .sort((a, b) => new Date(a.endsAt!).getTime() - new Date(b.endsAt!).getTime())
    .slice(0, 4)
})

// 트렌드 (미션 수 기준 또는 최근 시작일 기준)
const trendingList = computed(() => {
  return [...list.value]
    .sort((a, b) => {
      const mDiff = (b.missions?.length ?? 0) - (a.missions?.length ?? 0)
      if (mDiff !== 0) return mDiff
      return new Date(b.startsAt || 0).getTime() - new Date(a.startsAt || 0).getTime()
    })
    .slice(0, 6)
})

const banners = [
  {
    id: 1,
    title: t('home.heroTitle'),
    sub: t('home.heroLead'),
    image: '/hero_banner_reward_clean.png',
    link: '/campaigns'
  }
]
</script>

<template>
  <div class="home-container">
    <!-- Banner Section -->
    <section class="banner-area">
      <div v-for="b in banners" :key="b.id" class="banner-card">
        <img :src="b.image" alt="" class="banner-bg" />
        <div class="banner-content">
          <p class="badge white">{{ $t('home.badge') }}</p>
          <h1 class="banner-title" v-html="b.title.replace('\n', '<br>')"></h1>
          <p class="banner-sub">{{ b.sub }}</p>
          <RouterLink :to="b.link" class="btn primary glass">{{ $t('home.exploreCampaigns') }}</RouterLink>
        </div>
      </div>
    </section>

    <!-- Closing Soon Section -->
    <section class="home-section">
      <div class="section-head">
        <h2>{{ $t('home.sectionClosingSoon') }}</h2>
        <RouterLink to="/campaigns" class="view-all">{{ $t('home.viewAll') }} →</RouterLink>
      </div>
      
      <div v-if="loading" class="skeleton-grid">
        <div v-for="i in 4" :key="i" class="card skeleton"></div>
      </div>
      <div v-else-if="closingSoonList.length" class="horizontal-scroll">
        <div v-for="c in closingSoonList" :key="c.id" class="mini-card card">
          <div class="card-tag">{{ $t('campaign.statusActive') }}</div>
          <RouterLink :to="`/campaigns/${c.id}`" class="card-body">
            <div class="company-row" v-if="c.companyName || c.companyLogoUrl">
              <img v-if="c.companyLogoUrl" :src="getFileUrl(c.companyLogoUrl)" class="mini-logo" />
              <span class="company-name">{{ c.companyName }}</span>
            </div>
            <h3 class="card-title">{{ c.title }}</h3>
            <div class="card-footer">
              <span class="points">💰 {{ c.totalRewardPoints.toLocaleString() }} P</span>
              <span class="deadline">{{ new Date(c.endsAt!).toLocaleDateString() }}</span>
            </div>
          </RouterLink>
        </div>
      </div>
      <p v-else class="empty">{{ $t('home.noClosingSoon') }}</p>
    </section>

    <!-- Trending Section -->
    <section class="home-section">
      <div class="section-head">
        <h2>{{ $t('home.sectionTrending') }}</h2>
      </div>

      <div v-if="loading" class="skeleton-grid">
        <div v-for="i in 6" :key="i" class="card skeleton"></div>
      </div>
      <div v-else-if="trendingList.length" class="trending-grid">
        <div v-for="c in trendingList" :key="c.id" class="trend-card card">
          <div class="trend-left">
             <div class="company-row" v-if="c.companyName || c.companyLogoUrl">
              <img v-if="c.companyLogoUrl" :src="getFileUrl(c.companyLogoUrl)" class="mini-logo" />
              <span class="company-name">{{ c.companyName }}</span>
            </div>
            <h3 class="card-title">{{ c.title }}</h3>
            <p class="card-desc">{{ c.description }}</p>
          </div>
          <div class="trend-right">
             <div class="points">{{ (c.totalRewardPoints || 0).toLocaleString() }} P</div>
             <RouterLink :to="`/campaigns/${c.id}`" class="btn btn-sm">{{ $t('campaign.join') }}</RouterLink>
          </div>
        </div>
      </div>
      <p v-else class="empty">{{ $t('home.noTrending') }}</p>
    </section>

    <!-- Demo Note (Optional, Moved to bottom) -->
    <div class="hero-note card note">
      <strong>{{ $t('home.tryDemo') }}</strong>
      <p class="demo-line">
        {{ $t('home.demoAccounts', { user: 'user@demo.local', manager: 'manager@demo.local', admin: 'admin@demo.local' }) }}
      </p>
      <p class="demo-pw">{{ $t('home.demoPassword', { pw: 'demo1234' }) }}</p>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  gap: 3.5rem;
  padding-bottom: 2rem;
}

/* Banner */
.banner-area {
  width: 100%;
}
.banner-card {
  position: relative;
  width: 100%;
  aspect-ratio: 21 / 9;
  min-height: 380px;
  border-radius: 1.5rem;
  overflow: hidden;
  background: var(--bg-deep);
  display: flex;
  align-items: center;
  padding: 3rem;
  box-sizing: border-box;
}
.banner-bg {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  z-index: 0;
  opacity: 1;
}

.banner-card::after {
  content: "";
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: linear-gradient(90deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 50%, transparent 100%);
  z-index: 1;
}

.banner-content {
  position: relative;
  z-index: 2;
  max-width: 600px;
}
.banner-title {
  font-size: clamp(2rem, 6vw, 3.2rem);
  font-weight: 900;
  line-height: 1.1;
  color: #fff;
  margin: 1.5rem 0 1rem;
  letter-spacing: -0.05em;
  text-shadow: 0 4px 20px rgba(0,0,0,0.2);
}
.banner-sub {
  font-size: 1.15rem;
  color: rgba(255,255,255,0.9);
  margin-bottom: 2.5rem;
  line-height: 1.6;
}
.badge.white {
  background: rgba(255,255,255,0.2);
  color: #fff;
  backdrop-filter: blur(10px);
}
.btn.glass {
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.3);
  color: #fff;
}
.btn.glass:hover {
  background: #fff;
  color: var(--accent);
}

/* Sections */
.home-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.section-head h2 {
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0;
  color: var(--text-h);
}
.view-all {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--accent);
  text-decoration: none;
}

/* Horizontal Scroll */
.horizontal-scroll {
  display: flex;
  gap: 1.25rem;
  overflow-x: auto;
  padding-bottom: 1rem;
  scrollbar-width: none;
}
.horizontal-scroll::-webkit-scrollbar {
  display: none;
}
.mini-card {
  flex: 0 0 280px;
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
}
.card-tag {
  align-self: flex-start;
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--mint);
  background: var(--mint-soft);
  padding: 0.25rem 0.6rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}
.card-title {
  font-size: 1.15rem;
  margin: 0 0 0.75rem;
  color: var(--text-h);
  line-height: 1.4;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.card-desc {
  font-size: 0.9rem;
  color: var(--muted);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.card-footer {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
}
.points {
  font-weight: 800;
  color: var(--accent);
}
.deadline {
  color: var(--muted);
  font-weight: 600;
}

/* Trending Grid */
.trending-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1rem;
}
@media (max-width: 600px) {
  .trending-grid {
    grid-template-columns: 1fr;
  }
}
.trend-card {
  display: flex;
  justify-content: space-between;
  padding: 1.5rem;
  gap: 1rem;
}
.trend-left {
  flex: 1;
}
.trend-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  min-width: 100px;
}
.company-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.mini-logo {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid var(--border);
}
.company-name {
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--muted);
}
.btn-sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
}

.empty {
  text-align: center;
  padding: 3rem;
  color: var(--muted);
  background: var(--bg-deep);
  border-radius: 1rem;
}

.note {
  border-style: dashed;
  margin-top: 5rem;
}

/* Skeleton */
.skeleton {
  height: 200px;
  background: linear-gradient(90deg, var(--bg-deep) 25%, var(--border) 50%, var(--bg-deep) 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}
@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
