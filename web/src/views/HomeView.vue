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


const banners = computed(() => [
  {
    id: 1,
    title: t('home.heroTitle'),
    sub: t('home.heroLead'),
    image: '/hero_banner_reward_clean.png',
    link: '/campaigns'
  }
])

const faqs = ref([
  { q: t('home.faq1Q'), a: t('home.faq1A'), open: false },
  { q: t('home.faq2Q'), a: t('home.faq2A'), open: false },
  { q: t('home.faq3Q'), a: t('home.faq3A'), open: false },
  { q: t('home.faq4Q'), a: t('home.faq4A'), open: false },
])

const steps = computed(() => [
  { n: 1, title: t('home.step1Title'), desc: t('home.step1Desc'), icon: '👤' },
  { n: 2, title: t('home.step2Title'), desc: t('home.step2Desc'), icon: '🎯' },
  { n: 3, title: t('home.step3Title'), desc: t('home.step3Desc'), icon: '💰' },
])

</script>

<template>
  <div class="home-container">
    <!-- Hero Section -->
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

    <!-- Steps Section -->
    <section class="landing-section centered">
      <span class="section-tag">{{ $t('home.stepsTag') }}</span>
      <h2 class="section-title">{{ $t('home.stepsTitle') }}</h2>
      <p class="section-desc">{{ $t('home.stepsDesc') }}</p>
      
      <div class="step-grid">
        <div v-for="s in steps" :key="s.n" class="card step-card">
          <div class="step-number">{{ s.n }}</div>
          <h3 class="step-title">{{ s.title }}</h3>
          <p class="step-desc">{{ s.desc }}</p>
        </div>
      </div>
      
      <RouterLink to="/campaigns" class="btn primary" style="margin-top: 2rem">
        {{ $t('home.startNow') }}
      </RouterLink>
    </section>

    <!-- Campaigns Section (Closing Soon) -->
    <section class="landing-section">
      <div class="section-head">
        <div>
          <span class="section-tag">{{ $t('home.campaignsTag') }}</span>
          <h2 class="section-title">{{ $t('home.sectionClosingSoon') }}</h2>
        </div>
        <RouterLink to="/campaigns" class="view-all">{{ $t('home.viewAll') }} →</RouterLink>
      </div>
      
      <div v-if="loading" class="skeleton-grid">
        <div v-for="i in 4" :key="i" class="card skeleton"></div>
      </div>
      <div v-else-if="closingSoonList.length" class="trending-grid">
        <div v-for="c in closingSoonList" :key="c.id" class="trend-card card">
          <div class="trend-content">
            <div class="company-row" v-if="c.companyName || c.companyLogoUrl">
              <img v-if="c.companyLogoUrl" :src="getFileUrl(c.companyLogoUrl)" class="mini-logo" />
              <span class="company-name">{{ c.companyName }}</span>
            </div>
            <h3 class="card-title">{{ c.title }}</h3>
            <div class="points-badge">💰 {{ (c.totalRewardPoints || 0).toLocaleString() }} P</div>
            
            <div class="progress-container">
              <div class="progress-info">
                <span>{{ $t('home.progressLabel') }}</span>
                <span>{{ Math.min(100, Math.floor((c.missions?.length ?? 0) * 20)) }}%</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" :style="{ width: Math.min(100, (c.missions?.length ?? 0) * 20) + '%' }"></div>
              </div>
            </div>
          </div>
          <div class="trend-actions">
            <RouterLink :to="`/campaigns/${c.id}`" class="btn primary trend-btn">{{ $t('campaign.join') }}</RouterLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Proof Section -->
    <section class="landing-section centered">
      <span class="section-tag">{{ $t('home.proofTag') }}</span>
      <h2 class="section-title">{{ $t('home.proofTitle') }}</h2>
      <p class="section-desc">{{ $t('home.proofDesc') }}</p>
      
      <div class="proof-grid">
        <div v-for="i in 4" :key="i" class="card proof-card">
          <img :src="`/proof_mockup_${i}.png`" class="proof-img" @error="($event.target as HTMLImageElement).src = 'https://via.placeholder.com/300x533?text=Earnings+Proof'" />
        </div>
      </div>
      
      <button class="btn primary" style="margin-top: 2rem">{{ $t('home.exploreMore') }}</button>
    </section>

    <!-- FAQ Section -->
    <section class="landing-section centered">
      <span class="section-tag">{{ $t('home.faqTag') }}</span>
      <h2 class="section-title">{{ $t('home.faqTitle') }}</h2>
      
      <div class="faq-list">
        <div v-for="(f, i) in faqs" :key="i" class="faq-item">
          <div class="faq-q" @click="f.open = !f.open">
            <span>{{ f.q }}</span>
            <span>{{ f.open ? '−' : '+' }}</span>
          </div>
          <div v-if="f.open" class="faq-a">
            {{ f.a }}
          </div>
        </div>
      </div>
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

.deadline-tag {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: #ff4757;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.mini-card:hover {
  transform: translateY(-8px) scale(1.02);
}

/* Trending Grid */
.trending-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.25rem;
}

@media (max-width: 1000px) {
  .trending-grid {
    display: flex;
    overflow-x: auto;
    padding-bottom: 1rem;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .trending-grid::-webkit-scrollbar {
    display: none;
  }
  .trend-card {
    flex: 0 0 280px;
  }
}

.trend-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1.25rem;
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
  font-size: 1.2rem;
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
  width: 100%;
}

.trend-btn {
  width: 100%;
  padding: 0.75rem;
  font-size: 0.95rem;
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
  
  .mini-card {
    flex: 0 0 280px;
  }
}
</style>
