<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
const isOpen = ref(false)
const containerRef = ref<HTMLElement | null>(null)

const languages = [
  { code: 'ko', name: 'KR', flag: '🇰🇷' },
  { code: 'en', name: 'EN', flag: '🇺🇸' },
  { code: 'pt', name: 'PT', flag: '🇧🇷' }
]

const currentLang = computed(() => languages.find(l => l.code === locale.value) || languages[0])

function toggle() {
  isOpen.value = !isOpen.value
}

function setLocale(code: string) {
  locale.value = code
  localStorage.setItem('locale', code)
  isOpen.value = false
}

function handleClickOutside(event: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="lang-container" ref="containerRef">
    <button type="button" class="lang-active" @click="toggle" :class="{ open: isOpen }">
      <span class="flag">{{ currentLang.flag }}</span>
      <span class="name">{{ currentLang.name }}</span>
      <span class="arrow">▾</span>
    </button>

    <transition name="fade-slide">
      <div v-if="isOpen" class="lang-dropdown">
        <button 
          v-for="lang in languages" 
          :key="lang.code"
          type="button"
          class="lang-item"
          :class="{ selected: locale === lang.code }"
          @click="setLocale(lang.code)"
        >
          <span class="flag">{{ lang.flag }}</span>
          <span class="name">{{ lang.name }}</span>
          <span v-if="locale === lang.code" class="check">✓</span>
        </button>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.lang-container {
  position: relative;
  display: inline-block;
}

.lang-active {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.85rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--border);
  border-radius: 99px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-h);
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
}

.lang-active:hover {
  background: var(--accent-soft);
  border-color: var(--accent-border);
}

.lang-active.open {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.arrow {
  font-size: 0.75rem;
  opacity: 0.5;
  transition: transform 0.2s ease;
}

.open .arrow {
  transform: rotate(180deg);
}

.lang-dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 120px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 1rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  z-index: 200;
  padding: 0.4rem;
  backdrop-filter: blur(20px);
}

.lang-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.8rem;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 0.6rem;
  color: var(--text-p);
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s ease;
  text-align: left;
}

.lang-item:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

.lang-item.selected {
  background: var(--accent-soft);
  color: var(--accent);
}

.check {
  margin-left: auto;
  font-size: 0.8rem;
}

/* Animation */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 600px) {
  .lang-active .name {
    display: none;
  }
}
</style>
