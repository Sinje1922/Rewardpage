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

const banners = computed(() => [
  {
    id: 1,
    title: t('home.heroTitle'),
    sub: t('home.heroLead'),
    image: '/hero_banner_reward_clean.png',
    link: '/campaigns'
  }
])
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
          <div class="trend-content">
             <div class="company-row" v-if="c.companyName || c.companyLogoUrl">
              <img v-if="c.companyLogoUrl" :src="getFileUrl(c.companyLogoUrl)" class="mini-logo" />
              <span class="company-name">{{ c.companyName }}</span>
            </div>
            <div class="title-row">
              <h3 class="card-title">{{ c.title }}</h3>
              <div class="points-badge">💰 {{ (c.totalRewardPoints || 0).toLocaleString() }} P</div>
            </div>
            <p class="card-desc">{{ c.description }}</p>
          </div>
          <div class="trend-actions">
             <RouterLink :to="`/campaigns/${c.id}`" class="btn primary trend-btn">{{ $t('campaign.join') }}</RouterLink>
          </div>
        </div>
      </div>
      <p v-else class="empty">{{ $t('home.noTrending') }}</p>
    </section>


  </div>
</template>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  gap: 4rem;
  padding-bottom: 5rem;
}

/* Banner / Hero Section */
.banner-area {
  width: 100%;
  animation: revealUp 0.8s cubic-bezier(0.2, 1, 0.2, 1);
}

.banner-card {
  position: relative;
  width: 100%;
  aspect-ratio: 21 / 9;
  min-height: 420px;
  border-radius: 2rem;
  overflow: hidden;
  background: #0f172a;
  display: flex;
  align-items: center;
  padding: 4rem;
  box-sizing: border-box;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
}

/* Dynamic Gradient Background */
.banner-card::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 20% 30%, rgba(108, 92, 231, 0.4) 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, rgba(0, 206, 201, 0.3) 0%, transparent 50%);
  z-index: 1;
  animation: pulseGradient 10s ease-in-out infinite alternate;
}

@keyframes pulseGradient {
  0% { opacity: 0.5; transform: scale(1); }
  100% { opacity: 0.8; transform: scale(1.1); }
}

.banner-bg {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  z-index: 0;
  opacity: 0.6;
  filter: saturate(1.2);
}

.banner-card::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.4) 50%, transparent 100%);
  z-index: 2;
}

.banner-content {
  position: relative;
  z-index: 3;
  max-width: 650px;
  animation: revealUp 1s cubic-bezier(0.2, 1, 0.2, 1) 0.2s backwards;
}

.banner-title {
  font-size: clamp(2.5rem, 6vw, 3.8rem);
  font-weight: 900;
  line-height: 1.05;
  color: #fff;
  margin: 1.5rem 0 1.2rem;
  letter-spacing: -0.06em;
  text-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

.banner-sub {
  font-size: 1.25rem;
  color: rgba(255,255,255,0.85);
  margin-bottom: 3rem;
  line-height: 1.6;
  font-weight: 500;
}

.badge.white {
  background: rgba(255,255,255,0.15);
  color: #fff;
  backdrop-filter: blur(12px);
  padding: 0.5rem 1rem;
  border-radius: 99px;
  font-weight: 800;
  border: 1px solid rgba(255,255,255,0.2);
}

/* Section Common */
.home-section {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  animation: revealUp 0.8s cubic-bezier(0.2, 1, 0.2, 1) calc(var(--delay, 0) * 0.1s + 0.4s) backwards;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-head h2 {
  font-size: 1.75rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  background: linear-gradient(135deg, var(--text-h), var(--muted));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin: 0;
}

.view-all {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--accent);
  text-decoration: none;
}

/* Horizontal Scroll - Mini Cards */
.horizontal-scroll {
  display: flex;
  gap: 1.5rem;
  overflow-x: auto;
  padding: 0.5rem 0.5rem 1.5rem;
  scrollbar-width: none;
}
.horizontal-scroll::-webkit-scrollbar { display: none; }

.mini-card {
  flex: 0 0 300px;
  transition: all 0.4s cubic-bezier(0.2, 1, 0.2, 1);
}

.mini-card:hover {
  transform: translateY(-8px) scale(1.02);
}

/* Trending Grid */
.trending-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
  gap: 1.5rem;
}

.trend-card {
  padding: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  border: 1px solid var(--border);
  background: var(--panel);
}

.trend-card:hover {
  border-color: var(--accent);
  background: var(--bg-card);
}

.trend-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.company-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}

.mini-logo {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  object-fit: cover;
  border: 1px solid var(--border);
  background: var(--bg-card);
}

.company-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--muted);
}

.title-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.card-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.points-badge {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 0.4rem 0.9rem;
  border-radius: 99px;
  white-space: nowrap;
  border: 1px solid var(--accent-border);
}

.card-desc {
  margin: 0.25rem 0 0;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--text);
  opacity: 0.85;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.trend-actions {
  flex-shrink: 0;
}

.trend-btn {
  padding: 0.8rem 1.8rem;
  font-size: 1rem;
  box-shadow: 0 4px 12px var(--accent-soft);
}



/* Skeleton */
.skeleton {
  height: 240px;
  border-radius: 1.5rem;
  background: var(--bg-deep);
  position: relative;
  overflow: hidden;
}

.skeleton::after {
  content: "";
  position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
  animation: skeletonScan 2s infinite;
}

@keyframes skeletonScan {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}

@keyframes revealUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .banner-card { padding: 2rem; aspect-ratio: 16 / 10; min-height: 320px; }
  .banner-title { font-size: 2rem; }
  .trending-grid { grid-template-columns: 1fr; }
  
  .trend-card {
    flex-direction: column;
    align-items: flex-start;
    padding: 1.75rem;
    gap: 1.5rem;
  }
  
  .trend-content {
    width: 100%;
  }

  .title-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .trend-actions {
    width: 100%;
  }

  .trend-btn {
    width: 100%;
  }

  .mini-card {
    flex: 0 0 280px;
  }
}
</style>
