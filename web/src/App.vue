<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref, computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { api } from './api/client'
import LanguageSwitcher from './components/LanguageSwitcher.vue'
import DarkModeToggle from './components/DarkModeToggle.vue'
import AiChatbot from './components/AiChatbot.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const showChatbot = ref(false)

// Notification Center State
const showNotifications = ref(false)
const winsList = ref<any[]>([])
const readNotificationIds = ref<string[]>([])

const handleLogout = () => {
  auth.logout()
  router.push('/')
}

// Load read notifications from localStorage
const loadReadNotifications = () => {
  try {
    const saved = localStorage.getItem('read_wins')
    if (saved) {
      readNotificationIds.value = JSON.parse(saved)
    }
  } catch (e) {
    console.error(e)
  }
}

// Save read notification to localStorage
const markAsRead = (winId: string) => {
  if (!readNotificationIds.value.includes(winId)) {
    readNotificationIds.value.push(winId)
    localStorage.setItem('read_wins', JSON.stringify(readNotificationIds.value))
  }
}

const markAllAsRead = () => {
  winsList.value.forEach(w => {
    if (!readNotificationIds.value.includes(w.id)) {
      readNotificationIds.value.push(w.id)
    }
  })
  localStorage.setItem('read_wins', JSON.stringify(readNotificationIds.value))
}

// Unread wins count
const unreadCount = computed(() => {
  return winsList.value.filter(w => !readNotificationIds.value.includes(w.id)).length
})

// Fetch user wins
const fetchUserWins = async () => {
  if (!auth.token) return
  try {
    const { data } = await api.get('/me/wins')
    winsList.value = data
  } catch (e) {
    console.error('Failed to fetch user wins for notifications:', e)
  }
}

const closeDropdown = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.bell-container')) {
    showNotifications.value = false
  }
}

onMounted(() => {
  if (auth.token) {
    auth.loadMe()
    loadReadNotifications()
    fetchUserWins()
  }
  document.addEventListener('click', closeDropdown)
})

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown)
})

// Refresh wins on route changes
watch(() => route.path, () => {
  if (auth.token) {
    auth.loadMe()
    fetchUserWins()
  }
})

watch(() => auth.token, (newVal) => {
  if (newVal) {
    loadReadNotifications()
    fetchUserWins()
  } else {
    winsList.value = []
    readNotificationIds.value = []
  }
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
          <!-- Right: Utils -->
          <div v-if="auth.token" class="bell-container">
            <button class="icon-btn bell-btn pc-only" @click="showNotifications = !showNotifications">
              <span class="bell-icon">🔔</span>
              <span v-if="unreadCount > 0" class="bell-badge">{{ unreadCount }}</span>
            </button>
            
            <!-- Glassmorphic Dropdown Notification Center -->
            <transition name="fade-slide">
              <div v-if="showNotifications" class="bell-dropdown">
                <div class="dropdown-header">
                  <h3>🔔 알림 센터</h3>
                  <button v-if="unreadCount > 0" class="btn-clear-all" @click="markAllAsRead">모두 읽음</button>
                </div>
                <div class="dropdown-body">
                  <div v-if="winsList.length === 0" class="empty-notifications">
                    <span class="empty-icon">📭</span>
                    <p class="empty-txt">아직 도착한 알림이 없습니다.</p>
                  </div>
                  <div v-else class="notifications-list">
                    <div 
                      v-for="win in winsList" 
                      :key="win.id" 
                      class="notification-item"
                      :class="{ 'is-unread': !readNotificationIds.includes(win.id) }"
                      @click="markAsRead(win.id); showNotifications = false; router.push(`/campaigns`)"
                    >
                      <div class="noti-bullet">🎉</div>
                      <div class="noti-content">
                        <span class="noti-tag">캠페인 당첨</span>
                        <p class="noti-text">
                          축하합니다! <strong>[{{ win.campaign?.title || '캠페인' }}]</strong>에 당첨되셨습니다.
                        </p>
                        <div class="noti-reward-row">
                          <span class="noti-reward-val">+{{ win.points.toLocaleString() }}P 적립 완료</span>
                          <span class="noti-time">{{ new Date(win.createdAt).toLocaleDateString() }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </transition>
          </div>

          <!-- AI Chatbot Toggle Button -->
          <button class="icon-btn chatbot-btn" @click="showChatbot = !showChatbot" aria-label="AI Helper" title="AI Chatbot">
            <span class="chatbot-icon">🤖</span>
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
            <RouterLink v-if="auth.token && auth.user && auth.user.role === 'USER'" to="/request-manager">
              {{ $i18n.locale === 'ko' ? '매니저 권한 신청' : ($i18n.locale === 'pt' ? 'Solicitar Gerente' : 'Apply for Manager') }}
            </RouterLink>
          </div>
          <div class="link-col">
            <h4>{{ $t('common.support') }}</h4>
            <RouterLink to="/faq">{{ $i18n.locale === 'ko' ? '자주 묻는 질문 (FAQ)' : ($i18n.locale === 'pt' ? 'Perguntas Frequentes (FAQ)' : 'FAQ') }}</RouterLink>
            <a href="mailto:support@pickku.com">Contact Us</a>
          </div>
          <div class="link-col">
            <h4>{{ $t('common.legal') }}</h4>
            <RouterLink to="/terms">{{ $i18n.locale === 'ko' ? '이용약관' : ($i18n.locale === 'pt' ? 'Termos de Serviço' : 'Terms of Service') }}</RouterLink>
            <RouterLink to="/privacy">{{ $i18n.locale === 'ko' ? '개인정보처리방침' : ($i18n.locale === 'pt' ? 'Política de Privacidade' : 'Privacy Policy') }}</RouterLink>
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
    <AiChatbot :isOpen="showChatbot" @close="showChatbot = false" />
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
  max-width: 1400px;
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

.chatbot-btn {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
}
.chatbot-btn:hover {
  transform: scale(1.08) rotate(8deg);
  background: #f8fafc;
  border-color: #cbd5e1;
}
:root.dark .chatbot-btn {
  background: rgba(30, 41, 59, 0.8) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
}
:root.dark .chatbot-btn:hover {
  background: rgba(30, 41, 59, 1) !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
}
.chatbot-icon {
  font-size: 1.25rem;
  display: inline-block;
  transition: transform 0.25s ease;
}
.chatbot-btn:hover .chatbot-icon {
  animation: chatbot-bounce 0.5s ease infinite alternate;
}
@keyframes chatbot-bounce {
  0% { transform: translateY(0); }
  100% { transform: translateY(-3px); }
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
  max-width: 1400px;
  margin: 0 auto;
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

/* Premium Notification Center CSS */
.bell-container {
  position: relative;
  display: inline-block;
}

.bell-btn {
  position: relative;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.bell-btn:hover {
  transform: scale(1.05) rotate(15deg);
}

.bell-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: #ef4444;
  color: white;
  font-size: 0.7rem;
  font-weight: 800;
  min-width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  box-shadow: 0 4px 10px rgba(239, 68, 68, 0.3);
}

:root.dark .bell-badge {
  border-color: var(--panel);
}

.bell-dropdown {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 360px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 1.25rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
  z-index: 1001;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

:root.dark .bell-dropdown {
  background: rgba(15, 23, 42, 0.85);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.dropdown-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

:root.dark .dropdown-header {
  border-bottom-color: rgba(255, 255, 255, 0.06);
}

.dropdown-header h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-h);
}

.btn-clear-all {
  background: transparent;
  border: none;
  color: #6366f1;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  transition: background 0.2s;
}

.btn-clear-all:hover {
  background: rgba(99, 102, 241, 0.06);
}

.dropdown-body {
  max-height: 400px;
  overflow-y: auto;
}

.empty-notifications {
  padding: 3rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.empty-icon {
  font-size: 2.2rem;
  animation: floating 4s ease-in-out infinite;
}

.empty-txt {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--muted);
}

.notifications-list {
  display: flex;
  flex-direction: column;
}

.notification-item {
  padding: 1.25rem 1.5rem;
  display: flex;
  gap: 1rem;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid rgba(0, 0, 0, 0.02);
}

:root.dark .notification-item {
  border-bottom-color: rgba(255, 255, 255, 0.02);
}

.notification-item:hover {
  background: rgba(0, 0, 0, 0.02);
}

:root.dark .notification-item:hover {
  background: rgba(255, 255, 255, 0.02);
}

.notification-item.is-unread {
  background: rgba(99, 102, 241, 0.03);
}

:root.dark .notification-item.is-unread {
  background: rgba(99, 102, 241, 0.05);
}

.noti-bullet {
  font-size: 1.2rem;
}

.noti-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.noti-tag {
  font-size: 0.7rem;
  font-weight: 800;
  color: #6366f1;
  text-transform: uppercase;
}

.noti-text {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.45;
  color: var(--text-h);
}

.noti-text strong {
  font-weight: 800;
}

.noti-reward-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.25rem;
}

.noti-reward-val {
  font-size: 0.8rem;
  font-weight: 800;
  color: #22c55e;
}

.noti-time {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--muted);
}

/* Dropdown Slide Transition */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
