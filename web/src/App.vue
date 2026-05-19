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
    <div v-if="route.path === '/'" class="bg-blob blob-1" aria-hidden="true" />
    <div v-if="route.path === '/'" class="bg-blob blob-2" aria-hidden="true" />

    <header v-if="route.path !== '/setup'" :class="['header-modern', { 'is-full-width': route.path === '/' || route.path === '/campaigns' }]">
      <div class="header-inner">
        <!-- Left: Logo -->
        <RouterLink to="/" class="logo-area">
          <span class="logo-mark">✦</span>
          <span class="logo-text">pickku</span>
        </RouterLink>

        <!-- Center: Single Capsule Nav -->
        <div class="nav-container pc-only">
          <nav class="nav-pill">
            <RouterLink to="/" class="nav-item">{{ $t('nav.home') }}</RouterLink>
            <RouterLink to="/campaigns" class="nav-item">{{ $t('nav.campaigns') }}</RouterLink>
            <RouterLink v-if="auth.token" to="/my-page" class="nav-item">{{ $t('nav.myPage') }}</RouterLink>
            <RouterLink v-if="auth.isOperator" to="/ops" class="nav-item">{{ $t('nav.ops') }}</RouterLink>
            <RouterLink v-if="auth.isAdmin" to="/admin" class="nav-item">{{ $t('nav.admin') }}</RouterLink>
          </nav>
        </div>

        <!-- Right: Utils -->
        <div class="utils-area">
          <div v-if="auth.user" class="points-pill">
            <span class="coin">🪙</span>
            <span class="balance">{{ auth.user.pointBalance.toLocaleString() }}</span>
            <span class="unit">P</span>
          </div>
          <button class="icon-btn bell-btn pc-only">
            <span class="bell-icon">🔔</span>
          </button>
          <LanguageSwitcher class="pc-only" />
          <div class="auth-wrapper">
             <button v-if="!auth.token" @click="router.push('/login')" class="btn-login">{{ $t('nav.login') }}</button>
             <button v-else @click="handleLogout()" class="btn-logout">{{ $t('nav.logout') }}</button>
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

    <main :class="['main-content-wide', { 'is-home': route.path === '/', 'is-full-width': route.path === '/campaigns' }]">
      <RouterView />
    </main>

    <!-- Mobile: 하단 네비게이션 바 -->
    <nav v-if="route.path !== '/setup'" class="bottom-nav mobile-only">
      <RouterLink to="/" class="b-nav-item">
        <span class="icon">🏠</span>
        <span class="label">{{ $t('nav.home') }}</span>
      </RouterLink>
      <RouterLink to="/campaigns" class="b-nav-item">
        <span class="icon">🏛️</span>
        <span class="label">{{ $t('nav.campaigns') }}</span>
      </RouterLink>
      <RouterLink to="/my-page" class="b-nav-item">
        <span class="icon">👤</span>
        <span class="label">{{ $t('nav.myPage') }}</span>
      </RouterLink>
      <RouterLink v-if="auth.token && auth.isOperator" to="/ops" class="b-nav-item">
        <span class="icon">🛠️</span>
        <span class="label">{{ $t('nav.ops') }}</span>
      </RouterLink>
      <RouterLink v-if="auth.token && auth.isAdmin" to="/admin" class="b-nav-item">
        <span class="icon">⚙️</span>
        <span class="label">{{ $t('nav.admin') }}</span>
      </RouterLink>
    </nav>

    <footer v-if="route.path !== '/setup'" class="main-footer">
      <div class="footer-content">
        <div class="footer-brand">
          <div class="brand-row">
            <span class="brand-mark">✦</span>
            <span class="brand-text">pickku</span>
          </div>
          <p class="footer-desc">{{ $t('common.footerDesc') }}</p>
        </div>
        <div class="footer-links-grid">
          <div class="link-col">
            <h4>{{ $t('common.platform') }}</h4>
            <RouterLink to="/campaigns">{{ $t('nav.campaigns') }}</RouterLink>
            <RouterLink to="/my-page">{{ $t('nav.myPage') }}</RouterLink>
          </div>
          <div class="link-col">
            <h4>{{ $t('common.support') }}</h4>
            <RouterLink to="/faq">FAQ</RouterLink>
            <a href="mailto:support@pickku.com">Contact Us</a>
          </div>
          <div class="link-col">
            <h4>{{ $t('common.legal') }}</h4>
            <RouterLink to="/terms">Terms of Service</RouterLink>
            <RouterLink to="/privacy">Privacy Policy</RouterLink>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <span class="copyright">&copy; 2026 pickku. All rights reserved.</span>
        <span class="version">MVP Version</span>
      </div>
    </footer>

    <div class="mobile-lang-floating mobile-only">
      <LanguageSwitcher />
    </div>
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

/* Background Blobs (Premium Glow) */
.bg-blob {
  position: fixed;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.25;
  pointer-events: none;
  z-index: 0;
}
.blob-1 {
  width: 800px; height: 800px;
  top: -200px; right: -100px;
  background: radial-gradient(circle, #6366f1 0%, transparent 70%);
}
.blob-2 {
  width: 700px; height: 700px;
  bottom: -200px; left: -200px;
  background: radial-gradient(circle, #a3e635 0%, transparent 70%);
}

/* Header: Pixel-Perfect to Image */
.header-modern {
  position: sticky;
  top: 0;
  z-index: 1000;
  padding: 1.5rem 2rem;
  width: 100%;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.01);
  backdrop-filter: blur(10px);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
}

.header-modern.is-full-width {
  padding: 1.5rem 5rem;
}

.header-modern.is-full-width .header-inner {
  max-width: none;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
}
.logo-mark {
  color: #6366f1;
  font-size: 1.8rem;
  font-weight: 900;
}
.logo-text {
  font-size: 1.8rem;
  font-weight: 900;
  color: var(--text-h);
  letter-spacing: -0.05em;
}

.nav-pill {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.4rem 0.4rem;
  background: white;
  border-radius: 99px;
  box-shadow: 0 4px 25px rgba(0, 0, 0, 0.05);
  border: 1px solid #f1f5f9;
}

.nav-item {
  padding: 0.6rem 1.5rem;
  border-radius: 99px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #64748b;
  text-decoration: none;
  transition: all 0.2s ease;
}
.nav-item:hover, .nav-item.router-link-active {
  color: #1e293b;
  background: #f8fafc;
}

.utils-area {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.points-pill {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.25rem;
  background: #fffbeb;
  border-radius: 99px;
  font-weight: 800;
  font-size: 0.95rem;
  color: #b45309;
  box-shadow: 0 4px 15px rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.1);
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  cursor: pointer;
}
.points-pill:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(251, 191, 36, 0.18);
}
.points-pill .coin {
  display: inline-block;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.points-pill:hover .coin {
  transform: rotate(360deg);
}
:root.dark .points-pill {
  background: rgba(251, 191, 36, 0.12);
  color: #f59e0b;
  border-color: rgba(251, 191, 36, 0.25);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}
.points-pill .balance { color: #1e293b; }
:root.dark .points-pill .balance { color: #f8fafc; }
.points-pill .unit { color: #94a3b8; font-size: 0.8rem; margin-left: 2px; }

.icon-btn {
  background: white;
  border: 1px solid #f1f5f9;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(0,0,0,0.03);
}

.btn-login {
  background: #6366f1;
  color: white;
  border: none;
  padding: 0.75rem 1.75rem;
  border-radius: 14px;
  font-weight: 800;
  font-size: 0.95rem;
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.25);
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-login:hover { transform: translateY(-2px); box-shadow: 0 12px 25px rgba(99, 102, 241, 0.35); }

.btn-logout {
  background: white;
  color: #64748b;
  border: 1px solid #e2e8f0;
  padding: 0.75rem 1.75rem;
  border-radius: 14px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-logout:hover { background: #f8fafc; color: #1e293b; border-color: #cbd5e1; }

/* Main Content Expansive */
.main-content-wide {
  flex: 1;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 2.5rem 2rem;
  box-sizing: border-box;
  min-height: 80vh;
  transition: max-width 0.3s ease, padding 0.3s ease;
}

.main-content-wide.is-home {
  max-width: none;
  padding: 0;
}

.main-content-wide.is-full-width {
  max-width: none;
  padding: 3rem 5rem;
}

/* Onboarding Banner Modern */
.onboarding-banner {
  margin: 1rem auto 0;
  max-width: 1400px;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  border-radius: 1.25rem;
  padding: 1rem 2rem;
  color: white;
  box-shadow: 0 15px 35px rgba(99, 102, 241, 0.2);
}
.banner-content { display: flex; align-items: center; justify-content: center; gap: 1rem; }
.banner-btn {
  background: white; color: #6366f1;
  padding: 0.5rem 1.5rem; border-radius: 99px;
  font-weight: 800; text-decoration: none;
}

/* Common */
.pc-only { display: flex; }
.mobile-only { display: none; }

@media (max-width: 1024px) {
  .pc-only { display: none; }
  .mobile-only { display: flex; }
  .header-modern { padding: 1rem; }
  .header-modern.is-full-width { padding: 1rem; }
  .logo-text { font-size: 1.5rem; }
  .main-content-wide.is-full-width {
    padding: 2rem;
  }
}

/* Footer: Compact Original from Image */
.main-footer {
  padding: 4rem 2rem 3rem;
  background: var(--bg);
  border-top: 1px solid var(--border);
}
.footer-content {
  max-width: 1280px;
  margin: 0 auto 3rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 4rem;
}
.footer-brand {
  max-width: 400px;
}
.brand-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}
.brand-mark { color: #6366f1; font-size: 1.4rem; font-weight: 900; }
.brand-text { font-size: 1.6rem; font-weight: 900; color: var(--text-h); letter-spacing: -0.04em; }
.footer-desc {
  color: var(--muted);
  line-height: 1.6;
  font-size: 0.95rem;
  font-weight: 500;
}
.footer-links-grid {
  display: flex;
  gap: 6rem;
}
.link-col h4 {
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-h);
  margin-bottom: 1.5rem;
}
.link-col a {
  display: block;
  color: var(--text);
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 0.8rem;
  transition: color 0.2s;
}
.link-col a:hover { color: #6366f1; }
  
.footer-bottom {
  max-width: 1280px;
  margin: 0 auto;
  padding-top: 2rem;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 600;
}

@media (max-width: 1024px) {
  .footer-content { flex-direction: column; gap: 3rem; }
  .footer-links-grid { gap: 3rem; width: 100%; justify-content: space-between; }
}
@media (max-width: 640px) {
  .footer-links-grid { display: grid; grid-template-columns: 1fr 1fr; }
  .main-content-wide.is-full-width {
    padding: 1.5rem 1rem;
  }
}

/* Beautiful Premium Mobile Bottom Navigation Bar */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 68px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  display: none; /* Controlled by media query below */
  justify-content: space-around;
  align-items: center;
  z-index: 999;
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -5px 25px rgba(0, 0, 0, 0.03);
}

:root.dark .bottom-nav {
  background: rgba(15, 23, 42, 0.85);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 -5px 25px rgba(0, 0, 0, 0.2);
}

.b-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  color: var(--muted);
  text-decoration: none;
  font-weight: 800;
  font-size: 0.72rem;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  flex: 1;
  height: 100%;
}

.b-nav-item .icon {
  font-size: 1.35rem;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.b-nav-item:hover {
  color: var(--accent);
}

.b-nav-item:active {
  transform: scale(0.9);
}

/* RouterLink Active Highlight Style */
.b-nav-item.router-link-active {
  color: var(--accent);
}

.b-nav-item.router-link-active .icon {
  transform: translateY(-4px) scale(1.18);
}

@media (max-width: 1024px) {
  .bottom-nav {
    display: flex;
  }
  .main-content-wide {
    padding-bottom: 90px !important; /* Avoid cut-off content */
  }
  .main-footer {
    padding-bottom: 110px !important; /* Space footer above bottom-nav */
  }
  
  /* Floating Language Switcher above theme toggle */
  .mobile-lang-floating {
    position: fixed;
    bottom: 11.25rem;
    right: 1.25rem;
    z-index: 1000;
    display: flex;
  }
}
</style>
