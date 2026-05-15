<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import LanguageSwitcher from './components/LanguageSwitcher.vue'
import DarkModeToggle from './components/DarkModeToggle.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const handleLogout = () => {
  auth.logout()
  router.push('/')
}

onMounted(() => {
  if (auth.token) auth.loadMe()
})

// 페이지를 이동할 때마다 유저 정보를 갱신하여 최신 포인트를 보여줍니다.
watch(() => route.path, () => {
  if (auth.token) auth.loadMe()
})
</script>

<template>
  <div class="layout">
    <div class="bg-blob blob-1" aria-hidden="true" />
    <div class="bg-blob blob-2" aria-hidden="true" />

    <header v-if="route.path !== '/setup'" class="top-modern">
      <div class="top-inner">
        <!-- Logo -->
        <RouterLink to="/" class="brand-modern">
          <span class="brand-text">pickku</span>
        </RouterLink>

        <!-- Centered Capsule Nav -->
        <nav class="nav-capsule pc-only">
          <RouterLink to="/campaigns" class="nav-link">{{ $t('navMissions') }}</RouterLink>
          <RouterLink to="/leaderboard" class="nav-link">{{ $t('navLeaderboard') }}</RouterLink>
          <RouterLink to="/rewards" class="nav-link">{{ $t('navRewards') }}</RouterLink>
          <RouterLink to="/community" class="nav-link">{{ $t('navCommunity') }}</RouterLink>
        </nav>

        <!-- Right Utils -->
        <div class="nav-utils-modern">
          <div v-if="auth.user" class="nav-points-modern">
            <span class="coin">🪙</span>
            <span class="balance">{{ auth.user.pointBalance.toLocaleString() }}</span>
            <span class="unit">P</span>
          </div>
          <button class="icon-btn bell-btn pc-only">🔔</button>
          <LanguageSwitcher />
          <div class="auth-box">
             <button v-if="!auth.token" @click="router.push('/login')" class="btn primary purple-btn sm">{{ $t('connectWallet') }}</button>
             <button v-else @click="handleLogout()" class="btn outline sm logout-btn">{{ $t('nav.logout') }}</button>
          </div>
        </div>
      </div>

      <!-- Onboarding Banner -->
      <div v-if="auth.token && auth.isProfileIncomplete" class="onboarding-banner fade-in">
        <div class="banner-content">
          <span class="banner-icon">✨</span>
          <p class="banner-text" v-html="$t('onboarding.message')"></p>
          <RouterLink to="/my-page" class="banner-btn">{{ $t('onboarding.btn') }}</RouterLink>
        </div>
      </div>
    </header>

    <main class="main-wide">
      <RouterView />
    </main>

    <!-- Mobile: 하단 네비게이션 바 -->
    <nav v-if="auth.token && route.path !== '/setup'" class="bottom-nav mobile-only">
      <RouterLink to="/" class="b-nav-item">
        <span class="icon">🏠</span>
        <span class="label">{{ $t('nav.home') }}</span>
      </RouterLink>
      <RouterLink to="/campaigns" class="b-nav-item">
        <span class="icon">🏛️</span>
        <span class="label">{{ $t('nav.campaigns') }}</span>
      </RouterLink>
      <RouterLink v-if="auth.token" to="/my-page" class="b-nav-item">
        <span class="icon">👤</span>
        <span class="label">{{ $t('nav.myPage') }}</span>
      </RouterLink>
      <RouterLink v-if="auth.isOperator" to="/ops" class="b-nav-item">
        <span class="icon">🛠️</span>
        <span class="label">{{ $t('nav.ops') }}</span>
      </RouterLink>
      <RouterLink v-if="auth.isAdmin" to="/admin" class="b-nav-item">
        <span class="icon">⚙️</span>
        <span class="label">{{ $t('nav.admin') }}</span>
      </RouterLink>
    </nav>

    <footer v-if="route.path !== '/setup'" class="main-footer pc-only">
      <div class="footer-content">
        <div class="footer-brand">
          <div class="brand-row">
            <span class="brand-mark" aria-hidden="true">✦</span>
            <span class="brand-text">{{ $t('common.brand') }}</span>
          </div>
          <p class="footer-desc">{{ $t('common.footerDesc') }}</p>
        </div>
        <div class="footer-links">
          <div class="link-col">
            <h4>{{ $t('common.platform') }}</h4>
            <RouterLink to="/campaigns">{{ $t('nav.campaigns') }}</RouterLink>
            <RouterLink to="/my-page">{{ $t('nav.myPage') }}</RouterLink>
          </div>
          <div class="link-col">
            <h4>{{ $t('common.support') }}</h4>
            <RouterLink to="/faq">FAQ</RouterLink>
            <a href="mailto:support@rewardplatform.com">Contact Us</a>
          </div>
          <div class="link-col">
            <h4>{{ $t('common.legal') }}</h4>
            <RouterLink to="/terms">Terms of Service</RouterLink>
            <RouterLink to="/privacy">Privacy Policy</RouterLink>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <span>&copy; {{ new Date().getFullYear() }} {{ $t('common.brand') }}. All rights reserved.</span>
        <span>MVP Version</span>
      </div>
    </footer>

    <DarkModeToggle />
  </div>
</template>
<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-x: clip;
}

/* Background Blobs */
.bg-blob {
  position: fixed;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.3;
  pointer-events: none;
  z-index: 0;
}
.blob-1 {
  width: 600px; height: 600px;
  top: -100px; right: -50px;
  background: radial-gradient(circle, #6366f1 0%, transparent 70%);
}
.blob-2 {
  width: 500px; height: 500px;
  bottom: -100px; left: -100px;
  background: radial-gradient(circle, #a3e635 0%, transparent 70%);
}

/* Modern Capsule Header */
.top-modern {
  position: sticky;
  top: 0;
  z-index: 1000;
  padding: 1.5rem 2rem;
  width: 100%;
  box-sizing: border-box;
}

.top-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.brand-modern {
  text-decoration: none;
}
.brand-text {
  font-size: 1.8rem;
  font-weight: 900;
  color: #1e293b;
  letter-spacing: -0.05em;
}

.nav-capsule {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: white;
  border-radius: 99px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  border: 1px solid #f1f5f9;
}

.nav-link {
  padding: 0.6rem 1.25rem;
  border-radius: 99px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #64748b;
  text-decoration: none;
  transition: all 0.2s ease;
}
.nav-link:hover, .nav-link.router-link-active {
  color: #1e293b;
  background: #f8fafc;
}

.nav-utils-modern {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.nav-points-modern {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #f8fafc;
  border-radius: 99px;
  font-weight: 800;
  font-size: 0.95rem;
  color: #1e293b;
}
.nav-points-modern .balance { color: #1e293b; }
.nav-points-modern .unit { color: #94a3b8; font-size: 0.8rem; }

.icon-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
}

.purple-btn {
  background: #6366f1;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 800;
  font-size: 0.9rem;
  box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3);
  cursor: pointer;
  transition: all 0.2s ease;
}
.purple-btn:hover { transform: translateY(-2px); background: #4f46e5; }

/* Wide Layout */
.main-wide {
  flex: 1;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

/* Onboarding Banner */
.onboarding-banner {
  margin: 1rem auto 0;
  max-width: 1400px;
  background: #6366f1;
  border-radius: 1rem;
  padding: 1rem 2rem;
  color: white;
}
.banner-content { display: flex; align-items: center; justify-content: center; gap: 1rem; }
.banner-btn {
  background: white; color: #6366f1;
  padding: 0.5rem 1.5rem; border-radius: 99px;
  font-weight: 800; text-decoration: none;
}

/* Utilities */
.pc-only { display: block; }
.mobile-only { display: none; }

/* Mobile Bottom Nav */
.bottom-nav {
  position: fixed;
  bottom: 1.5rem; left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex; gap: 0.5rem; padding: 0.5rem;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid #f1f5f9;
  border-radius: 1.5rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  width: calc(100% - 2rem);
  max-width: 450px;
}
.b-nav-item {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.2rem;
  padding: 0.6rem 0.25rem;
  color: #94a3b8; text-decoration: none;
  border-radius: 1rem; transition: all 0.2s;
}
.b-nav-item.router-link-active { background: #f1f5f9; color: #1e293b; }

/* Footer Modern */
.main-footer {
  padding: 6rem 2rem 4rem;
  background: #f8fafc;
  border-top: 1px solid #f1f5f9;
}
.footer-content {
  max-width: 1400px;
  margin: 0 auto 4rem;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 4rem;
}
.footer-brand { display: flex; flex-direction: column; gap: 1rem; }
.footer-brand .brand-text { font-size: 1.5rem; }
.footer-desc { color: #64748b; line-height: 1.6; font-size: 0.95rem; }
.link-col { display: flex; flex-direction: column; gap: 1rem; }
.link-col h4 { font-weight: 800; color: #1e293b; margin-bottom: 0.5rem; }
.link-col a { color: #64748b; text-decoration: none; font-weight: 500; }
.footer-bottom {
  max-width: 1400px;
  margin: 0 auto;
  padding-top: 2rem;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  color: #94a3b8;
  font-size: 0.85rem;
  font-weight: 600;
}

@media (max-width: 1100px) {
  .footer-content { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 768px) {
  .pc-only { display: none; }
  .mobile-only { display: flex; }
  .top-modern { padding: 1rem; }
  .footer-content { grid-template-columns: 1fr; gap: 2.5rem; }
}
</style>
