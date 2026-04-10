<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="hero">
    <p class="badge">참여형 이벤트 · 추첨 리워드</p>
    <h1 class="hero-title">미션만 하면 끝,<br />보상은 추첨으로!</h1>
    <p class="hero-lead">
      운영자가 캠페인과 미션을 구성하고, 유저는 미션에 참여해요. 조건을 맞춘 분들 중에서 추첨으로 리워드를 드리는 방식이에요. SNS 연동 없이도 가볍게
      시작할 수 있어요.
    </p>
    <div class="hero-actions">
      <RouterLink class="btn primary" to="/campaigns">캠페인 둘러보기</RouterLink>
      <RouterLink class="btn" to="/login">로그인</RouterLink>
    </div>
    <div class="hero-note card note">
      <strong>데모로 바로 써보기</strong>
      <p class="demo-line">
        일반 유저 <code>user@demo.local</code> · 운영 <code>manager@demo.local</code> · 관리자 <code>admin@demo.local</code>
      </p>
      <p class="demo-pw">비밀번호는 모두 <code>demo1234</code> 입니다.</p>
    </div>
  </section>
</template>

<style scoped>
.hero {
  text-align: left;
  padding-top: 0.25rem;
}

.badge {
  margin-bottom: 0.75rem;
}

.hero-title {
  font-size: clamp(1.65rem, 5vw, 2.25rem);
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.04em;
  margin: 0 0 1rem;
  color: var(--text-h);
}

.hero-lead {
  max-width: 36rem;
  margin-bottom: 1.35rem;
  font-size: 1.02rem;
  line-height: 1.65;
  color: var(--text);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 1.5rem;
}

.note {
  max-width: 36rem;
  border-style: dashed;
  border-width: 2px;
  background: color-mix(in srgb, var(--panel) 92%, var(--mint-soft));
}

.note strong {
  display: block;
  font-size: 0.95rem;
  margin-bottom: 0.5rem;
  color: var(--text-h);
}

.demo-line {
  font-size: 0.88rem;
  margin-bottom: 0.35rem;
  word-break: break-all;
}

.demo-pw {
  font-size: 0.88rem;
  color: var(--muted);
  font-weight: 600;
}
</style>
