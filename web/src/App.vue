<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()
const route = useRoute()

onMounted(() => {
  if (auth.token) auth.loadMe()
})

// 페이지를 이동할 때마다 (예: 리스트에서 상세로, 마이페이지로 등) 유저 정보를 갱신하여 최신 포인트를 보여줍니다.
watch(() => route.path, () => {
  if (auth.token) auth.loadMe()
})
</script>

<template>
  <div class="layout">
    <div class="bg-blob blob-1" aria-hidden="true" />
    <div class="bg-blob blob-2" aria-hidden="true" />

    <header class="top">
      <RouterLink to="/" class="brand">
        <span class="brand-mark" aria-hidden="true">✦</span>
        <span class="brand-text">리워드</span>
      </RouterLink>
      <nav class="nav" aria-label="메인">
        <RouterLink to="/campaigns" class="nav-link">캠페인</RouterLink>
        <RouterLink v-if="auth.token" to="/me" class="nav-link">내 참여</RouterLink>
        <RouterLink v-if="auth.isOperator" to="/ops" class="nav-link">운영</RouterLink>
        <RouterLink v-if="auth.isAdmin" to="/admin" class="nav-link">관리자</RouterLink>
        
        <div v-if="auth.user" class="nav-points">
          <span class="coin">🪙</span>
          <span class="balance">{{ auth.user.pointBalance.toLocaleString() }}</span>
          <span class="unit">P</span>
        </div>

        <RouterLink v-if="!auth.token" to="/login" class="nav-link nav-cta">로그인</RouterLink>
        <button v-else type="button" class="nav-link linkish" @click="auth.logout()">로그아웃</button>
      </nav>
    </header>

    <main class="main">
      <RouterView />
    </main>

    <footer class="foot">
      <span>유저 참여 · 운영자 미션 구성 · 추첨 보상 · MVP</span>
    </footer>
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 0.75rem 1.5rem;
  margin: 0 auto;
  max-width: 1000px;
  width: calc(100% - 2rem);
  box-sizing: border-box;
  border-radius: 1.25rem;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
}

@media (prefers-color-scheme: dark) {
  .top {
    background: rgba(15, 23, 42, 0.7);
  }
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

.nav {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.nav-link {
  padding: 0.5rem 1rem;
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

.nav-cta {
  background: var(--accent);
  color: #fff !important;
  box-shadow: 0 4px 12px var(--accent-soft);
}
.nav-cta:hover {
  background: var(--accent-bright);
}

.nav-points {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.85rem;
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: 99px;
  margin: 0 0.5rem;
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

.main {
  position: relative;
  z-index: 1;
  flex: 1;
  padding: 3rem 1.5rem 5rem;
  max-width: 1040px;
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
</style>
