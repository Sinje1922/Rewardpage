<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import LanguageSwitcher from './components/LanguageSwitcher.vue'
import DarkModeToggle from './components/DarkModeToggle.vue'

const auth = useAuthStore()
const route = useRoute()

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

    <header class="top">
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
            <RouterLink v-if="auth.token" to="/me" class="nav-link">{{ $t('nav.myActivity') }}</RouterLink>
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
            <RouterLink v-if="!auth.token" to="/login" class="nav-link nav-cta">{{ $t('nav.login') }}</RouterLink>
            <button v-else type="button" class="nav-link nav-cta logout" @click="auth.logout()">{{ $t('nav.logout') }}</button>
          </div>
        </div>
      </div>
    </header>

    <main class="main">
      <RouterView />
    </main>

    <!-- Mobile: 하단 네비게이션 바 -->
    <nav class="bottom-nav mobile-only">
      <RouterLink to="/" class="b-nav-item">
        <span class="icon">🏠</span>
        <span class="label">{{ $t('nav.home') }}</span>
      </RouterLink>
      <RouterLink to="/campaigns" class="b-nav-item">
        <span class="icon">🏛️</span>
        <span class="label">{{ $t('nav.campaigns') }}</span>
      </RouterLink>
      <RouterLink v-if="auth.token" to="/me" class="b-nav-item">
        <span class="icon">👤</span>
        <span class="label">{{ $t('nav.myActivity') }}</span>
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

    <footer class="foot pc-only">
      <span>{{ $t('home.badge') }} · MVP</span>
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

.bg-blob {
  position: fixed;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.45;
  pointer-events: none;
  z-index: 0;
}
.blob-1 {
  width: min(500px, 80vw);
  height: min(500px, 80vw);
  top: -150px;
  right: -100px;
  background: radial-gradient(circle, var(--accent-bright) 0%, transparent 70%);
}
.blob-2 {
  width: min(400px, 70vw);
  height: min(400px, 70vw);
  bottom: -150px;
  left: -150px;
  background: radial-gradient(circle, var(--mint) 0%, transparent 70%);
}

.top {
  position: sticky;
  top: 1rem;
  z-index: 100;
  margin: 0 auto;
  max-width: 1600px;
  width: calc(100% - 2rem);
  box-sizing: border-box;
}

.top-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 0.6rem 1.25rem;
  border-radius: 1.25rem;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
}

:root.dark .top-content {
  background: rgba(15, 23, 42, 0.7);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.5rem; /* 로고와 메뉴 사이의 간격 */
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 800;
  font-size: 1.25rem;
  letter-spacing: -0.04em;
  color: var(--text-h);
}
.brand-mark {
  font-size: 1.2rem;
  color: var(--accent);
}

.nav-main {
  display: flex;
  gap: 0.25rem;
  align-items: center;
}

.nav-link {
  padding: 0.5rem 0.85rem;
  border-radius: 0.75rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--muted);
  transition: all 0.2s ease;
}
.nav-link:hover {
  color: var(--accent);
  background: var(--accent-soft);
}
.nav-link.router-link-active:not(.nav-cta) {
  color: var(--accent);
  background: var(--accent-soft);
}

.nav-utils {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.nav-points {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.85rem;
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: 99px;
}
.nav-points .coin {
  font-size: 1rem;
}
.nav-points .balance {
  font-weight: 800;
  color: var(--accent);
  font-size: 0.95rem;
}
.nav-points .unit {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--accent);
  opacity: 0.8;
}

.nav-cta {
  background: var(--accent);
  color: #fff !important;
  box-shadow: 0 4px 12px var(--accent-soft);
}
.nav-cta:hover {
  background: var(--accent-bright);
}
.nav-cta.logout {
  border: none;
  cursor: pointer;
}

.main {
  position: relative;
  z-index: 1;
  flex: 1;
  padding: 3rem 1.5rem 5rem;
  max-width: 1600px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.foot {
  padding: 2.5rem 1.5rem;
  text-align: center;
  font-size: 0.85rem;
  color: var(--muted);
  border-top: 1px solid var(--border);
  background: var(--panel);
}

/* Mobile Bottom Nav */
.bottom-nav {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border);
  border-radius: 1.5rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  width: calc(100% - 3rem);
  max-width: 500px;
}

:root.dark .bottom-nav {
  background: rgba(30, 41, 59, 0.8);
}

.b-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.6rem 0.25rem;
  color: var(--muted);
  text-decoration: none;
  border-radius: 1rem;
  transition: all 0.2s ease;
}

.b-nav-item .icon {
  font-size: 1.25rem;
}

.b-nav-item .label {
  font-size: 0.7rem;
  font-weight: 700;
}

.b-nav-item:hover {
  color: var(--accent);
}

.b-nav-item.router-link-active {
  background: var(--accent-soft);
  color: var(--accent);
}

/* Visibility Control */
.mobile-only {
  display: none;
}

@media (max-width: 850px) {
  .pc-only {
    display: none;
  }
  .mobile-only {
    display: flex;
  }
  .top {
    top: 0.5rem;
  }
  .top-content {
    justify-content: center;
  }
  .nav-utils {
    width: 100%;
    justify-content: space-between;
  }
  .main {
    padding-bottom: 8rem;
  }
}
</style>
