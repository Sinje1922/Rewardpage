<script setup lang="ts">
import { ref, onMounted } from 'vue'

const isDark = ref(false)

function updateTheme() {
  if (isDark.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

function toggle() {
  isDark.value = !isDark.value
  updateTheme()
}

onMounted(() => {
  const saved = localStorage.getItem('theme')
  if (saved) {
    isDark.value = saved === 'dark'
  } else {
    // 시스템 설정 확인
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  updateTheme()
})
</script>

<template>
  <button 
    type="button" 
    class="dark-mode-toggle" 
    @click="toggle"
    :title="isDark ? '라이트 모드로 전환' : '다크 모드로 전환'"
  >
    <span v-if="isDark" class="icon">☀️</span>
    <span v-else class="icon">🌙</span>
  </button>
</template>

<style scoped>
.dark-mode-toggle {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background: var(--panel);
  border: 1px solid var(--border);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  z-index: 1000;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(12px);
}

.dark-mode-toggle:hover {
  transform: scale(1.1) rotate(12deg);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
  background: var(--bg-deep);
  border-color: var(--accent);
}

.dark-mode-toggle:active {
  transform: scale(0.95);
}

.icon {
  user-select: none;
}

@media (max-width: 600px) {
  .dark-mode-toggle {
    bottom: 6rem; /* 모바일 하단바 피하기 */
    right: 1.5rem;
    width: 3rem;
    height: 3rem;
    font-size: 1.25rem;
  }
}
</style>
