<script setup lang="ts"></script>
<template>
  <div class="legal-page card">
    <h1>이용약관 (Terms of Service)</h1>
    <div class="legal-content">
      <h3>제 1 조 (목적)</h3>
      <p>본 약관은 pickku(이하 "회사")가 제공하는 제반 서비스의 이용과 관련하여 회사와 회원과의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
      
      <h3>제 2 조 (용어의 정의)</h3>
      <p>1. "서비스"라 함은 구현되는 단말기와 상관없이 "회원"이 이용할 수 있는 pickku 및 관련 제반 서비스를 의미합니다.</p>
      <p>2. "회원"이라 함은 회사의 "서비스"에 접속하여 본 약관에 따라 "회사"와 이용계약을 체결하고 "회사"가 제공하는 "서비스"를 이용하는 고객을 말합니다.</p>

      <h3>제 3 조 (약관의 게시와 개정)</h3>
      <p>1. "회사"는 이 약관의 내용을 "회원"이 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다.</p>
      <p>2. "회사"는 관련법을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.</p>
      
      <h3>제 4 조 (서비스의 제공 등)</h3>
      <p>1. 회사는 회원에게 캠페인 참여를 통한 리워드 획득 기회를 제공합니다.</p>
      <p>2. 회사는 서비스의 원활한 제공을 위해 필요한 경우 서비스의 내용을 변경할 수 있습니다.</p>
    </div>
  </div>
</template>
<style scoped>
.legal-page { padding: 3rem; max-width: 800px; margin: 0 auto; animation: revealUp 0.6s cubic-bezier(0.2, 1, 0.2, 1) backwards; }
.legal-page h1 { font-size: 2rem; margin-bottom: 2rem; color: var(--text-h); font-weight: 800; }
.legal-content h3 { font-size: 1.2rem; margin: 1.5rem 0 0.75rem; color: var(--text-h); font-weight: 700; }
.legal-content p { color: var(--text); line-height: 1.6; margin-bottom: 0.5rem; }

@keyframes revealUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
