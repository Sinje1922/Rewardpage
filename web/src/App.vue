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

    <header v-if="route.path !== '/setup'" class="top">
      <div class="top-content">
        <div class="header-left">
          <!-- PC: 로고 및 이름 -->
          <RouterLink to="/" class="brand pc-only">
            <span class="brand-mark" aria-hidden="true">✦</span>
            <span class="brand-text">{{ $t('common.brand') }}</span>
          </RouterLink>

          <!-- PC: 메뉴 -->
          <nav class="nav-main pc-only">
            <RouterLink to="/" class="nav-link">{{ $t('nav.home') }}</RouterLink>
            <RouterLink to="/campaigns" class="nav-link">{{ $t('nav.campaigns') }}</RouterLink>
            <RouterLink v-if="auth.token" to="/my-page" class="nav-link">{{ $t('nav.myPage') }}</RouterLink>
            <RouterLink v-if="auth.isOperator" to="/ops" class="nav-link">{{ $t('nav.ops') }}</RouterLink>
            <RouterLink v-if="auth.isAdmin" to="/admin" class="nav-link">{{ $t('nav.admin') }}</RouterLink>
          </nav>
        </div>

        <!-- UTILS: 포인트, 언어, 로그인/로그아웃 (PC & Mobile) -->
        <div class="nav-utils">
          <div v-if="auth.user" class="nav-points">
            <span class="coin">🪙</span>
            <span class="balance">{{ auth.user.pointBalance.toLocaleString() }}</span>
            <span class="unit">P</span>
          </div>

          <LanguageSwitcher />

          <div class="auth-box">
            <RouterLink v-if="!auth.token && route.path !== '/login'" to="/login" class="nav-link nav-cta">{{ $t('nav.login') }}</RouterLink>
            <button v-else-if="auth.token" type="button" class="nav-link nav-cta logout" @click="handleLogout()">{{ $t('nav.logout') }}</button>
          </div>
        </div>
      </div>

      <!-- Onboarding Banner: Profile Incomplete Notification -->
      <div v-if="auth.token && auth.isProfileIncomplete" class="onboarding-banner fade-in">
        <div class="banner-content">
          <span class="banner-icon">✨</span>
          <p class="banner-text" v-html="$t('onboarding.message')"></p>
          <RouterLink to="/my-page" class="banner-btn">{{ $t('onboarding.btn') }}</RouterLink>
        </div>
      </div>
    </header>

    <main class="main">
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
            <h4>Platform</h4>
            <RouterLink to="/campaigns">Campaigns</RouterLink>
            <RouterLink to="/my-page">My Page</RouterLink>
          </div>
          <div class="link-col">
            <h4>Support</h4>
            <RouterLink to="/faq">FAQ</RouterLink>
            <a href="mailto:support@rewardplatform.com">Contact Us</a>
          </div>
          <div class="link-col">
            <h4>Legal</h4>
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
  filter: blur(80px);
  opacity: 0.45;
  pointer-events: none;
  z-index: 0;
}
.blob-1 {
  width: min(500px, 80vw); height: min(500px, 80vw);
  top: -150px; right: -100px;
  background: radial-gradient(circle, var(--accent-bright) 0%, transparent 70%);
}
.blob-2 {
  width: min(400px, 70vw); height: min(400px, 70vw);
  bottom: -150px; left: -150px;
  background: radial-gradient(circle, var(--mint) 0%, transparent 70%);
}

/* Header / Navbar */
.top {
  position: sticky;
  top: 1rem;
  z-index: 100;
  margin: 0 auto;
  max-width: 1600px;
  width: calc(100% - 2rem);
}

.top-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 1.25rem;
  border-radius: 1.25rem;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

:root.dark .top-content {
  background: rgba(15, 23, 42, 0.7);
  border-color: rgba(255, 255, 255, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 900;
  font-size: 1.4rem;
  background: linear-gradient(135deg, var(--accent), #7d5fff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-decoration: none;
  letter-spacing: -0.05em;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.brand:hover { transform: scale(1.05); }

.nav-main { display: flex; align-items: center; gap: 0.5rem; }
.nav-link {
  padding: 0.5rem 0.85rem;
  border-radius: 0.8rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-p);
  text-decoration: none;
  transition: all 0.2s ease;
}
.nav-link:hover { color: var(--accent); background: var(--accent-soft); }
.nav-link.router-link-active:not(.nav-cta) { color: var(--accent); background: var(--accent-soft); }

.nav-utils { display: flex; align-items: center; gap: 1rem; }

.nav-points {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.45rem 1rem;
  background: var(--bg-deep);
  border: 1px solid var(--border);
  border-radius: 99px;
  transition: all 0.3s ease;
}
.nav-points:hover { border-color: var(--accent-border); transform: translateY(-1px); }
.nav-points .balance { font-weight: 800; color: var(--accent); font-size: 1rem; }

.nav-cta {
  background: linear-gradient(135deg, var(--accent), #7d5fff);
  color: #fff !important;
  box-shadow: 0 4px 15px rgba(108, 92, 231, 0.2);
}
.nav-cta:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(108, 92, 231, 0.3); }

/* Main Content */
.main {
  flex: 1;
  padding: 3rem 1.5rem 6rem;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
  animation: revealUp 0.8s cubic-bezier(0.2, 1, 0.2, 1) backwards;
}

@keyframes revealUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Mobile Bottom Nav */
.bottom-nav {
  position: fixed;
  bottom: 1.5rem; left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex; gap: 0.5rem; padding: 0.5rem;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border);
  border-radius: 1.5rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  width: calc(100% - 3rem);
  max-width: 450px;
}
:root.dark .bottom-nav { background: rgba(30, 41, 59, 0.8); }

.b-nav-item {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.2rem;
  padding: 0.6rem 0.25rem;
  color: var(--muted); text-decoration: none;
  border-radius: 1rem; transition: all 0.2s;
}
.b-nav-item.router-link-active { background: var(--accent-soft); color: var(--accent); }

/* Onboarding Banner */
.onboarding-banner {
  margin-top: 0.75rem;
  background: linear-gradient(135deg, var(--accent) 0%, #7d5fff 100%);
  border-radius: 1.1rem;
  padding: 0.8rem 1.5rem;
  box-shadow: 0 10px 25px rgba(108, 92, 231, 0.2);
  color: white;
}
.banner-content { display: flex; align-items: center; justify-content: center; gap: 1rem; flex-wrap: wrap; }
.banner-btn {
  background: white; color: var(--accent);
  padding: 0.4rem 1.25rem; border-radius: 99px;
  font-size: 0.85rem; font-weight: 800; text-decoration: none;
  transition: all 0.2s;
}
.banner-btn:hover { transform: scale(1.05); }

/* Common Utilities */
.pc-only { display: block; }
.mobile-only { display: none; }

/* Footer */
.main-footer {
  margin-top: auto;
  padding: 4rem 2rem 2rem;
  background: color-mix(in srgb, var(--panel) 40%, transparent);
  backdrop-filter: blur(20px);
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.footer-content {
  width: 100%;
  max-width: 1200px;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 3rem;
  margin-bottom: 3rem;
}

.footer-brand {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 320px;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.footer-brand .brand-mark {
  font-size: 1.5rem;
  color: var(--accent);
}

.footer-brand .brand-text {
  font-size: 1.5rem;
  font-weight: 900;
  background: linear-gradient(135deg, var(--text-h), var(--accent));
  -webkit-background-clip: text;
  color: transparent;
}

.footer-desc {
  font-size: 0.95rem;
  color: var(--muted);
  line-height: 1.6;
  margin-top: 0.5rem;
}

.footer-links {
  display: flex;
  gap: 5rem;
}

.link-col {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.link-col h4 {
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-h);
  margin-bottom: 0.5rem;
}

.link-col a {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--muted);
  text-decoration: none;
  transition: color 0.2s ease;
}

.link-col a:hover {
  color: var(--accent);
}

.footer-bottom {
  width: 100%;
  max-width: 1200px;
  display: flex;
  justify-content: space-between;
  padding-top: 2rem;
  border-top: 1px solid var(--border);
  font-size: 0.85rem;
  color: var(--muted);
  font-weight: 600;
}

@media (max-width: 900px) {
  .pc-only { display: none; }
  .mobile-only { display: flex; }
  .top { top: 0.5rem; }
  .top-content { padding: 0.75rem; }
  .nav-utils { width: 100%; justify-content: space-between; }
  .main { padding: 1.5rem 1rem 8rem; }
}
</style>
