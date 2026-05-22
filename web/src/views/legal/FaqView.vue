<script setup lang="ts">
import { ref } from 'vue';

const faqs = [
  { q: 'qReward', a: 'aReward' },
  { q: 'qDraw', a: 'aDraw' },
  { q: 'qGoogle', a: 'aGoogle' },
  { q: 'qWallet', a: 'aWallet' },
  { q: 'qVerificationFail', a: 'aVerificationFail' },
  { q: 'qPointExpiry', a: 'aPointExpiry' },
  { q: 'qWeightedDraw', a: 'aWeightedDraw' }
];

const openIndex = ref<number | null>(null);

const toggleFaq = (index: number) => {
  openIndex.value = openIndex.value === index ? null : index;
};
</script>

<template>
  <div class="legal-page card">
    <h1>{{ $t('legal.faqTitle') }}</h1>
    <p class="faq-subtitle">
      {{ $i18n.locale === 'ko' ? '자주 묻는 질문과 답변을 모아두었습니다. 각 질문을 클릭하여 상세한 설명을 확인해보세요.' :
         $i18n.locale === 'en' ? 'Here are the most frequently asked questions. Click on any question to view the detailed explanation.' :
         'Reunimos as perguntas e respostas mais frequentes aqui. Clique em cada pergunta para ver a explicação detalhada.' }}
    </p>

    <div class="faq-container">
      <div 
        v-for="(faq, idx) in faqs" 
        :key="idx" 
        class="faq-item"
        :class="{ active: openIndex === idx }"
      >
        <button class="faq-trigger" @click="toggleFaq(idx)" :aria-expanded="openIndex === idx">
          <span class="faq-question">{{ $t(`legal.${faq.q}`) }}</span>
          <span class="faq-icon-box">
            <svg class="faq-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </span>
        </button>
        
        <div class="faq-answer-wrapper" :class="{ 'is-open': openIndex === idx }">
          <div class="faq-answer">
            <p class="faq-text">{{ $t(`legal.${faq.a}`) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.legal-page {
  padding: 3rem 2.5rem;
  max-width: 860px;
  margin: 0.5rem auto 2.5rem;
  background: var(--bg-card);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border);
  border-radius: 1.5rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  animation: revealUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

.legal-page h1 {
  font-size: 2.2rem;
  margin-bottom: 0.5rem;
  color: var(--text-h);
  font-weight: 800;
  letter-spacing: -0.03em;
  background: linear-gradient(135deg, var(--text-h) 30%, #5f3dc4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.faq-subtitle {
  font-size: 1.05rem;
  color: var(--text-light);
  margin-bottom: 2.5rem;
  line-height: 1.6;
}

.faq-container {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.faq-item {
  border: 1px solid var(--border);
  border-radius: 0.85rem;
  background: rgba(255, 255, 255, 0.02);
  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  overflow: hidden;
}

.faq-item:hover {
  border-color: rgba(95, 61, 196, 0.4);
  box-shadow: 0 4px 15px rgba(95, 61, 196, 0.04);
  background: rgba(255, 255, 255, 0.04);
}

.faq-item.active {
  border-color: var(--primary);
  background: rgba(95, 61, 196, 0.03);
  box-shadow: 0 4px 20px rgba(95, 61, 196, 0.06);
}

.faq-trigger {
  width: 100%;
  padding: 1.25rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  outline: none;
}

.faq-question {
  font-size: 1.05rem;
  color: var(--text-h);
  font-weight: 600;
  line-height: 1.5;
  transition: color 0.2s ease;
  padding-right: 1.5rem;
}

.faq-item.active .faq-question {
  color: var(--primary);
}

.faq-icon-box {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.03);
  color: var(--text-light);
  transition: all 0.3s ease;
  flex-shrink: 0;
}

:root.dark .faq-icon-box {
  background: rgba(255, 255, 255, 0.05);
}

.faq-arrow {
  width: 14px;
  height: 14px;
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.faq-item.active .faq-icon-box {
  background: var(--primary);
  color: #ffffff;
}

.faq-item.active .faq-arrow {
  transform: rotate(180deg);
}

/* Accordion Wrapper Transition */
.faq-answer-wrapper {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.faq-answer-wrapper.is-open {
  max-height: 500px; /* Big enough to container text */
}

.faq-answer {
  padding: 0 1.5rem 1.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.02);
}

:root.dark .faq-answer {
  border-top-color: rgba(255, 255, 255, 0.02);
}

.faq-text {
  color: var(--text);
  line-height: 1.7;
  font-size: 0.98rem;
  white-space: pre-wrap; /* Crucial to handle \n newlines safely and beautifully */
  margin: 0;
}

@keyframes revealUp {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Light / Dark Mode dynamic adjustment guarantee */
:root.dark .legal-page {
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.08);
}
</style>

