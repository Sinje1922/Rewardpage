<script setup lang="ts"></script>
<template>
  <div class="legal-page card">
    <h1>개인정보처리방침 (Privacy Policy)</h1>
    <div class="legal-content">
      <p>pickku(이하 "회사")은 개인정보보호법에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.</p>

      <h3>1. 개인정보의 처리 목적</h3>
      <p>회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않습니다.</p>
      <ul class="list">
        <li>회원 가입 및 관리</li>
        <li>서비스 제공 및 리워드 지급</li>
        <li>캠페인 추첨 및 결과 통보</li>
      </ul>

      <h3>2. 수집하는 개인정보 항목</h3>
      <p>회사는 서비스 제공을 위해 아래와 같은 최소한의 개인정보를 수집하고 있습니다.</p>
      <ul class="list">
        <li>필수항목: 이메일, 닉네임, 생년월일, 성별, 지갑 주소</li>
        <li>선택항목: 연동된 SNS 식별자 (Discord, YouTube 등)</li>
      </ul>

      <h3>3. 개인정보의 보유 및 이용기간</h3>
      <p>회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.</p>
    </div>
  </div>
</template>
<style scoped>
.legal-page { padding: 3rem; max-width: 800px; margin: 0 auto; animation: revealUp 0.6s cubic-bezier(0.2, 1, 0.2, 1) backwards; }
.legal-page h1 { font-size: 2rem; margin-bottom: 2rem; color: var(--text-h); font-weight: 800; }
.legal-content h3 { font-size: 1.2rem; margin: 1.5rem 0 0.75rem; color: var(--text-h); font-weight: 700; }
.legal-content p { color: var(--text); line-height: 1.6; margin-bottom: 0.5rem; }
.legal-content .list { padding-left: 1.5rem; margin-bottom: 1rem; margin-top: 0.5rem; }
.legal-content .list li { color: var(--text); line-height: 1.6; margin-bottom: 0.25rem; }

@keyframes revealUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
