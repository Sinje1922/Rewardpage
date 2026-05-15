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
  rewardCurrency: string
  rewardsConfig: string
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

const platformValues = computed(() => [
  { id: 1, title: t('home.value1Title'), desc: t('home.value1Desc'), icon: '🛡️' },
  { id: 2, title: t('home.value2Title'), desc: t('home.value2Desc'), icon: '✨' },
  { id: 3, title: t('home.value3Title'), desc: t('home.value3Desc'), icon: '⚡' },
])

function getRemainingTime(endsAt: string | null) {
  if (!endsAt) return ''
  const end = new Date(endsAt)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  if (diff <= 0) return t('home.closed')
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (days > 0) return t('home.remainingDays', { n: days })
  if (hours > 0) return t('home.remainingHours', { n: hours })
  return t('home.remainingMinutes', { n: minutes })
}

</script>

<template>
  <div class="home-container">
    <!-- Hero Area (Wide) -->
    <section class="hero-area">
      <div class="hero-inner">
        <div class="hero-content">
          <span class="hero-tag">{{ $t('heroTag') }}</span>
          <h1 class="hero-title" v-html="$t('heroTitleModern')"></h1>
          <p class="hero-lead">{{ $t('heroLeadModern') }}</p>
          
          <div class="hero-btns">
            <button class="btn purple-btn wide" @click="router.push('/campaigns')">{{ $t('startNow') }}</button>
          </div>

          <div class="active-members">
            <div class="avatar-stack">
              <div v-for="i in 3" :key="i" class="avatar-circle"></div>
              <div class="avatar-more">+2k</div>
            </div>
            <span class="members-text">{{ $t('activeMembers') }}</span>
          </div>
        </div>

        <div class="hero-visual">
          <div class="visual-placeholder">
            <div class="coin-placeholder">🪙</div>
            <!-- Floating Cards -->
            <div class="floating-card c1">
              <span>Earned Points</span>
              <p>+250 P</p>
            </div>
            <div class="floating-card c2">
              <span>New Mission</span>
              <p>Verified</p>
            </div>
            <div class="floating-card c3">
              <span>Community</span>
              <p>Active</p>
            </div>
            <div class="floating-card c4">
              <span>Rewards</span>
              <p>Claimed</p>
            </div>
            <div class="floating-card c5">
              <span>Users</span>
              <p>320K+</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats Bar -->
    <div class="stats-bar-wrap">
      <div class="stats-bar">
        <div class="stat-item">
          <div class="stat-icon"></div>
          <div class="stat-info">
            <span class="stat-val">320K+</span>
            <span class="stat-lab">{{ $t('statsActiveUsers') }}</span>
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-icon"></div>
          <div class="stat-info">
            <span class="stat-val">1.5M+</span>
            <span class="stat-lab">{{ $t('statsMissions') }}</span>
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-icon"></div>
          <div class="stat-info">
            <span class="stat-val">500M+</span>
            <span class="stat-lab">{{ $t('statsPoints') }}</span>
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-icon"></div>
          <div class="stat-info">
            <span class="stat-val">1.2K+</span>
            <span class="stat-lab">{{ $t('statsCommunities') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Steps Section -->
    <section class="landing-section centered">
      <h2 class="section-title">{{ $t('stepsTitleModern') }}</h2>
      <div class="step-grid-modern">
        <div v-for="i in 3" :key="i" class="step-card-modern card">
          <span class="step-badge">{{ i }}</span>
          <div class="icon-placeholder-step"></div>
          <h3 class="step-title-modern">{{ $t(`step${i}Title`) }}</h3>
          <p class="step-desc-modern">{{ $t(`step${i}Desc`) }}</p>
        </div>
      </div>
    </section>

    <!-- Hot Campaigns Section -->
    <section class="landing-section">
      <div class="section-head">
        <h2 class="section-title left">{{ $t('hotCampaignsTitle') }}</h2>
        <RouterLink to="/campaigns" class="view-all">{{ $t('viewAll') }}</RouterLink>
      </div>
      
      <div v-if="loading" class="skeleton-grid">
        <div v-for="i in 4" :key="i" class="card skeleton"></div>
      </div>
      <div v-else-if="closingSoonList.length" class="campaign-grid-modern">
        <div v-for="c in closingSoonList" :key="c.id" class="campaign-card-modern card">
          <div class="card-visual-area">
             <span class="status-tag">HOT</span>
             <div class="icon-placeholder-campaign"></div>
          </div>
          <div class="card-body-modern">
            <div class="company-row-modern" v-if="c.companyName">
              <div class="mini-logo-placeholder"></div>
              <span class="company-name-modern">{{ c.companyName }}</span>
            </div>
            <h3 class="card-title-modern">{{ c.title }}</h3>
            
            <div class="reward-row-modern">
              <div class="reward-pill">
                <span class="reward-amount">{{ (c.totalRewardPoints || 0).toLocaleString() }} P</span>
              </div>
            </div>
            
            <div class="card-footer-modern">
              <span class="participants-count">{{ $t('participantsCount', { n: '12,345' }) }}</span>
              <RouterLink :to="`/campaigns/${c.id}`" class="btn purple-btn sm">Join Now</RouterLink>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Why pickku (Values) Section -->
    <section class="landing-section centered">
      <span class="section-tag purple">WHY PICKKU</span>
      <h2 class="section-title">{{ $t('valuesTitleModern') }}</h2>
      
      <div class="values-grid-modern">
        <div class="value-card-modern card">
          <div class="icon-placeholder-value"></div>
          <div class="value-text">
            <h3 class="value-title-modern">{{ $t('whyPickkuSafe') }}</h3>
            <p class="value-desc-modern">{{ $t('whyPickkuSafeDesc') }}</p>
          </div>
        </div>
        <div class="value-card-modern card">
          <div class="icon-placeholder-value"></div>
          <div class="value-text">
            <h3 class="value-title-modern">{{ $t('whyPickkuEasy') }}</h3>
            <p class="value-desc-modern">{{ $t('whyPickkuEasyDesc') }}</p>
          </div>
        </div>
        <div class="value-card-modern card">
          <div class="icon-placeholder-value"></div>
          <div class="value-text">
            <h3 class="value-title-modern">{{ $t('whyPickkuInstant') }}</h3>
            <p class="value-desc-modern">{{ $t('whyPickkuInstantDesc') }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="landing-section centered">
      <div class="faq-layout-modern">
        <div class="faq-left">
          <span class="section-tag purple">QUESTIONS</span>
          <h2 class="section-title left">{{ $t('faqTitleModern') }}</h2>
          <div class="faq-list-modern">
            <div v-for="i in 4" :key="i" class="faq-item-modern">
              <div class="faq-q-modern" @click="faqs[i-1].open = !faqs[i-1].open">
                <span>{{ $t(`faq${i}Q`) }}</span>
                <span class="faq-plus">{{ faqs[i-1].open ? '−' : '+' }}</span>
              </div>
              <div v-if="faqs[i-1].open" class="faq-a-modern">
                {{ $t(`faq${i}A`) }}
              </div>
            </div>
          </div>
        </div>
        <div class="faq-right">
          <div class="character-placeholder"></div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  gap: 8rem;
  padding-bottom: 10rem;
  overflow-x: hidden;
}

/* Hero Area (Expansive) */
.hero-area {
  padding: 6rem 0 4rem;
  position: relative;
  background: radial-gradient(circle at 80% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 50%);
}
.hero-inner {
  max-width: 1500px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  align-items: center;
  gap: 4rem;
  padding: 0 2rem;
}
.hero-tag {
  color: #a3e635;
  font-weight: 800;
  font-size: 1.2rem;
  margin-bottom: 1.5rem;
  display: block;
  letter-spacing: 0.05em;
}
.hero-title {
  font-size: clamp(3rem, 6vw, 4.8rem);
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: -0.04em;
  color: #1e293b;
  margin-bottom: 2rem;
}
.hero-lead {
  font-size: 1.35rem;
  line-height: 1.6;
  color: #64748b;
  margin-bottom: 3rem;
  font-weight: 500;
  max-width: 550px;
}
.hero-btns {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 4rem;
}
.purple-btn {
  background: #6366f1;
  color: white;
  border: none;
  padding: 1.2rem 3rem;
  font-weight: 800;
  border-radius: 16px;
  font-size: 1.1rem;
  box-shadow: 0 15px 30px rgba(99, 102, 241, 0.3);
  transition: all 0.3s ease;
}
.purple-btn:hover {
  background: #4f46e5;
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(99, 102, 241, 0.4);
}

.active-members {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}
.avatar-stack {
  display: flex;
  align-items: center;
}
.avatar-circle {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #e2e8f0;
  border: 3px solid white;
  margin-right: -12px;
}
.avatar-more {
  width: 54px;
  height: 42px;
  border-radius: 21px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 800;
  color: #64748b;
  margin-left: 8px;
  border: 1px solid #e2e8f0;
}
.members-text {
  font-size: 1rem;
  font-weight: 700;
  color: #64748b;
}

/* Visual Area */
.hero-visual {
  position: relative;
  height: 650px;
}
.visual-placeholder {
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at center, #f5f3ff 0%, transparent 75%);
  position: relative;
}
.coin-placeholder {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 220px;
  height: 220px;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 6rem;
  font-weight: 900;
  color: white;
  box-shadow: 0 30px 60px rgba(245, 158, 11, 0.35);
  z-index: 1;
}

.floating-card {
  position: absolute;
  padding: 1.25rem 1.75rem;
  background: white;
  border-radius: 1.25rem;
  box-shadow: 0 15px 35px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  z-index: 2;
  animation: float 5s ease-in-out infinite;
  border: 1px solid rgba(0,0,0,0.02);
}
.floating-card span { font-weight: 800; font-size: 0.95rem; color: #64748b; }
.floating-card p { color: #1e293b; font-weight: 900; font-size: 1.25rem; margin: 0; }

.c1 { top: 5%; left: 15%; animation-delay: 0s; }
.c2 { top: 12%; right: 5%; animation-delay: 1.2s; }
.c3 { bottom: 15%; left: 5%; animation-delay: 0.6s; }
.c4 { top: 45%; right: -5%; animation-delay: 1.8s; }
.c5 { bottom: 8%; right: 15%; animation-delay: 2.4s; }

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(2deg); }
}

/* Stats Bar */
.stats-bar-wrap {
  max-width: 1400px;
  margin: -5rem auto 0;
  position: relative;
  z-index: 10;
  padding: 0 2rem;
}
.stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 2.5rem;
  background: white;
  border-radius: 2rem;
  box-shadow: 0 25px 60px rgba(0,0,0,0.08);
  border: 1px solid rgba(0,0,0,0.02);
}
.stat-item {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0 2rem;
  border-right: 1px solid #f1f5f9;
}
.stat-item:last-child { border: none; }
.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: #f8fafc;
}
.stat-val {
  display: block;
  font-size: 1.6rem;
  font-weight: 900;
  color: #1e293b;
  margin-bottom: 0.2rem;
}
.stat-lab {
  font-size: 0.9rem;
  color: #94a3b8;
  font-weight: 700;
}

/* Sections */
.landing-section {
  max-width: 1300px;
  margin: 0 auto;
  width: 100%;
}
.landing-section.centered { text-align: center; }
.section-tag {
  display: inline-block;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: var(--muted);
  margin-bottom: 1rem;
}
.section-tag.purple { color: #6366f1; }
.section-title {
  font-size: 2.2rem;
  font-weight: 900;
  margin-bottom: 3.5rem;
  color: var(--text-h);
}
.section-title.left { text-align: left; margin-bottom: 2.5rem; }

/* Steps */
.step-grid-modern {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}
.step-card-modern {
  padding: 3rem 2rem;
  border-radius: 2rem;
  background: #f8fafc;
  border: none;
  position: relative;
}
.step-badge {
  position: absolute;
  top: 1.5rem; left: 1.5rem;
  width: 28px;
  height: 28px;
  background: #6366f1;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.85rem;
}
.icon-placeholder-step {
  width: 80px;
  height: 80px;
  background: white;
  border-radius: 1.5rem;
  margin: 0 auto 2rem;
  box-shadow: 0 10px 20px rgba(0,0,0,0.04);
}
.step-title-modern {
  font-size: 1.25rem;
  font-weight: 800;
  margin-bottom: 1rem;
}
.step-desc-modern {
  font-size: 0.95rem;
  color: #64748b;
  line-height: 1.5;
}

/* Campaign Cards */
.campaign-grid-modern {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
}
.campaign-card-modern {
  display: flex;
  padding: 0;
  border-radius: 2rem;
  overflow: hidden;
  border: none;
  background: white;
  box-shadow: 0 15px 40px rgba(0,0,0,0.06);
}
.card-visual-area {
  width: 200px;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.status-tag {
  position: absolute;
  top: 1rem; right: 1rem;
  background: #fff;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.7rem;
  font-weight: 800;
  color: #ef4444;
}
.icon-placeholder-campaign {
  width: 100px;
  height: 100px;
  background: white;
  border-radius: 1.5rem;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
}
.card-body-modern {
  flex: 1;
  padding: 2rem;
}
.company-row-modern {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.mini-logo-placeholder {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: #f1f5f9;
}
.company-name-modern {
  font-size: 0.85rem;
  font-weight: 700;
  color: #64748b;
}
.card-title-modern {
  font-size: 1.3rem;
  font-weight: 900;
  margin-bottom: 1.5rem;
}
.reward-pill {
  display: inline-block;
  padding: 0.4rem 1rem;
  background: #f0f9ff;
  color: #0ea5e9;
  border-radius: 1rem;
  font-weight: 800;
  font-size: 0.9rem;
}
.card-footer-modern {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #f1f5f9;
}
.participants-count {
  font-size: 0.85rem;
  font-weight: 700;
  color: #94a3b8;
}

/* Values Modern */
.values-grid-modern {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}
.value-card-modern {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem;
  border-radius: 1.5rem;
  text-align: left;
}
.icon-placeholder-value {
  width: 56px;
  height: 56px;
  border-radius: 1rem;
  background: #f8fafc;
}
.value-title-modern {
  font-size: 1.1rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
}
.value-desc-modern {
  font-size: 0.85rem;
  color: #64748b;
  line-height: 1.4;
}

/* FAQ Modern */
.faq-layout-modern {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 4rem;
  text-align: left;
}
.faq-list-modern {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.faq-item-modern {
  background: #f8fafc;
  border-radius: 1rem;
  overflow: hidden;
}
.faq-q-modern {
  padding: 1.25rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  font-weight: 800;
  color: #1e293b;
}
.faq-plus { font-size: 1.2rem; color: #94a3b8; }
.faq-a-modern {
  padding: 0 2rem 1.5rem;
  font-size: 0.95rem;
  color: #64748b;
  line-height: 1.6;
}
.character-placeholder {
  width: 100%;
  height: 400px;
  background: #f1f5f9;
  border-radius: 2rem;
}

/* Utilities & Animations */
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

@media (max-width: 1100px) {
  .hero-inner { grid-template-columns: 1fr; text-align: center; }
  .hero-btns, .active-members { justify-content: center; }
  .hero-visual { height: 400px; }
  .stats-bar { grid-template-columns: repeat(2, 1fr); gap: 2rem; }
  .stat-item { border: none; }
  .faq-layout-modern { grid-template-columns: 1fr; }
  .faq-right { display: none; }
}

@media (max-width: 800px) {
  .step-grid-modern, .campaign-grid-modern, .values-grid-modern { grid-template-columns: 1fr; }
  .campaign-card-modern { flex-direction: column; }
  .card-visual-area { width: 100%; height: 200px; }
}
</style>
