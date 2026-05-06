<script setup lang="ts"></script>
<template>
  <div class="legal-page card">
    <h1>{{ $t('legal.faqTitle') }}</h1>
    <div class="legal-content">
      <div class="faq-item">
        <h3>{{ $t('legal.qReward') }}</h3>
        <p>{{ $t('legal.aReward') }}</p>
      </div>
      <div class="faq-item">
        <h3>{{ $t('legal.qDraw') }}</h3>
        <p>{{ $t('legal.aDraw') }}</p>
      </div>
      <div class="faq-item">
        <h3>{{ $t('legal.qGoogle') }}</h3>
        <p>{{ $t('legal.aGoogle') }}</p>
      </div>
      <div class="faq-item">
        <h3>{{ $t('legal.qWallet') }}</h3>
        <p>{{ $t('legal.aWallet') }}</p>
      </div>
    </div>
  </div>
</template>
<style scoped>
.legal-page { padding: 3rem; max-width: 800px; margin: 0 auto; animation: revealUp 0.6s cubic-bezier(0.2, 1, 0.2, 1) backwards; }
.legal-page h1 { font-size: 2rem; margin-bottom: 2rem; color: var(--text-h); font-weight: 800; }
.faq-item { margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border); }
.faq-item:last-child { border-bottom: none; }
.faq-item h3 { font-size: 1.1rem; color: var(--text-h); margin-bottom: 0.75rem; font-weight: 700; }
.faq-item p { color: var(--text); line-height: 1.6; }

@keyframes revealUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
