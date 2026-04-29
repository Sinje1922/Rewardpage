<script setup lang="ts"></script>
<template>
  <div class="legal-page card">
    <h1>자주 묻는 질문 (FAQ)</h1>
    <div class="legal-content">
      <div class="faq-item">
        <h3>Q. 리워드는 어떻게 받나요?</h3>
        <p>A. 미션을 완료하고 관리자가 승인하면 즉시 포인트가 지급됩니다.</p>
      </div>
      <div class="faq-item">
        <h3>Q. 캠페인 추첨은 어떻게 진행되나요?</h3>
        <p>A. 캠페인이 종료되면 시스템에서 무작위로 추첨을 진행합니다.</p>
      </div>
      <div class="faq-item">
        <h3>Q. 구글 로그인이 안 돼요.</h3>
        <p>A. 주소창이 올바른지 확인해 주세요. 시크릿 모드나 광고 차단기(Adblock)를 끄고 일반 브라우저 탭에서 다시 시도해 주시기 바랍니다.</p>
      </div>
      <div class="faq-item">
        <h3>Q. 지갑 주소는 왜 필요한가요?</h3>
        <p>A. 블록체인 기반의 리워드를 안전하고 투명하게 지급하기 위해 필요합니다.</p>
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
