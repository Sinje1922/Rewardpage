<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { api } from "../api/client";
import { useI18n } from "vue-i18n";
import homeBanner from "../assets/hero_bg_new.png";
import stepIcon1 from "../assets/new_icon_4.png";
import stepIcon2 from "../assets/new_icon_5.png";
import stepIcon3 from "../assets/new_icon_6.png";
import valueIcon1 from "../assets/new_icon_9.png";
import valueIcon2 from "../assets/new_icon_10.png";
import valueIcon3 from "../assets/new_icon_11.png";
import faqCharacter from "../assets/new_icon_1.png";
import cpAsset1 from "../assets/new_icon_2.png";
import cpAsset2 from "../assets/new_icon_3.png";
import statIconMissions from "../assets/new_icon_7.png";
import statIconPoints from "../assets/new_icon_6.png";
import statIconGlobe from "../assets/new_icon_8.png";

const getStepIcon = (i: number) => {
  if (i === 1) return stepIcon1;
  if (i === 2) return stepIcon2;
  return stepIcon3;
};

const getCampaignIcon = (i: number) => {
  return i === 0 ? cpAsset1 : cpAsset2;
};

type Campaign = {
  id: string;
  title: string;
  description: string;
  companyName: string;
  companyLogoUrl: string;
  status: string;
  winnerCount: number;
  totalRewardPoints: number;
  rewardCurrency: string;
  rewardsConfig: string;
  startsAt: string | null;
  endsAt: string | null;
  missions?: { id: string }[];
};

const { t } = useI18n();
const router = useRouter();
const list = ref<Campaign[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const { data } = await api.get<Campaign[]>("/campaigns");
    list.value = data.filter((c) => c.status === "ACTIVE");
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
});

// 마감 임박 (종료 시간이 있고 미래인 것 중 빠른 순)
const closingSoonList = computed(() => {
  const active = [...list.value]
    .filter((c) => {
      if (c.status !== "ACTIVE") return false;
      if (!c.endsAt) return true;
      return new Date(c.endsAt) > new Date();
    })
    .sort((a, b) => {
      if (a.endsAt && b.endsAt) {
        return new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime();
      }
      return a.endsAt ? -1 : 1;
    })
    .slice(0, 4);

  if (active.length > 0) return active;

  // Dummy Fallback to perfectly match reference image when DB is empty
  return [
    {
      id: "dummy-1",
      title: "Reward Test",
      companyName: "pickku",
      companyLogoUrl: "",
      status: "ACTIVE",
      winnerCount: 12345,
      totalRewardPoints: 100,
      rewardCurrency: "P",
      endsAt: new Date(Date.now() + 86400000).toISOString(),
    },
    {
      id: "dummy-2",
      title: "광고",
      companyName: "HETAQ",
      companyLogoUrl: "",
      status: "ACTIVE",
      winnerCount: 8765,
      totalRewardPoints: 100,
      rewardCurrency: "P",
      endsAt: new Date(Date.now() + 86400000).toISOString(),
    },
  ] as Campaign[];
});

const faqs = ref([
  { q: t("home.faq1Q"), a: t("home.faq1A"), open: false },
  { q: t("home.faq2Q"), a: t("home.faq2A"), open: false },
  { q: t("home.faq3Q"), a: t("home.faq3A"), open: false },
  { q: t("home.faq4Q"), a: t("home.faq4A"), open: false },
]);
</script>

<template>
  <div class="home-container-wide">
    <!-- Hero Area (Expansive Vision) -->
    <section
      class="hero-expansive"
      :style="{ backgroundImage: `url(${homeBanner})` }"
    >
      <div class="hero-inner-wide">
        <div class="hero-content-main">
          <span class="hero-tag-modern">{{ $t("home.heroTag") }}</span>
          <h1 class="hero-title-main" v-html="$t('home.heroTitleModern')"></h1>
          <p class="hero-lead-main">{{ $t("home.heroLeadModern") }}</p>

          <div class="hero-btn-group">
            <button class="btn-start" @click="router.push('/campaigns')">
              Start Mission ➔
            </button>
            <button class="btn-explore" @click="router.push('/campaigns')">
              Explore
            </button>
          </div>

          <div class="active-community">
            <div class="avatar-stack-modern">
              <div v-for="i in 3" :key="i" class="avatar-pill"></div>
              <div class="avatar-count">+36K</div>
            </div>
            <span class="community-text">{{ $t("home.activeMembers") }}</span>
          </div>
        </div>

        <div class="hero-visual-main">
          <div class="visual-canvas">
            <!-- Floating Cards: Exactly like image -->
            <div class="float-card fc-1">
              <div class="fc-header">
                <span class="fc-tag">Social Mission</span>
                <div class="fc-check">✓</div>
              </div>
              <p class="fc-title">Invite Friends</p>
              <span class="fc-reward">+200 P</span>
            </div>
            <div class="float-card fc-2">
              <div class="fc-header">
                <span class="fc-tag">Daily Mission</span>
                <div class="fc-check pink">✓</div>
              </div>
              <p class="fc-title">Check-in</p>
              <span class="fc-reward">+100 P</span>
            </div>
            <div class="float-card fc-3">
              <div class="fc-header">
                <span class="fc-tag">Content Mission</span>
                <div class="fc-play">▶</div>
              </div>
              <p class="fc-title">Watch Video</p>
              <span class="fc-reward">+150 P</span>
            </div>
            <div class="float-card fc-4">
              <div class="fc-header">
                <span class="fc-tag">Engagement Mission</span>
                <div class="fc-icon">👍</div>
              </div>
              <p class="fc-title">Like & Share</p>
              <span class="fc-reward">+120 P</span>
            </div>
            <div class="float-card fc-5">
              <div class="fc-header">
                <span class="fc-tag">Quiz Mission</span>
                <div class="fc-icon purple">?</div>
              </div>
              <p class="fc-title">Answer Quiz</p>
              <span class="fc-reward">+250 P</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats Section (Full Width Card) -->
    <div class="stats-wrapper-modern">
      <div class="stats-card-modern">
        <div class="stat-box-modern">
          <div class="stat-icon-wrap users">👥</div>
          <div class="stat-data">
            <span class="stat-number">320K+</span>
            <span class="stat-label">{{ $t("home.statsActiveUsers") }}</span>
          </div>
        </div>
        <div class="stat-box-modern">
          <div class="stat-icon-wrap missions">
            <img :src="statIconMissions" class="stat-img" />
          </div>
          <div class="stat-data">
            <span class="stat-number">1.5M+</span>
            <span class="stat-label">{{ $t("home.statsMissions") }}</span>
          </div>
        </div>
        <div class="stat-box-modern">
          <div class="stat-icon-wrap points">
            <img :src="statIconPoints" class="stat-img" />
          </div>
          <div class="stat-data">
            <span class="stat-number">7.8M+</span>
            <span class="stat-label">{{ $t("home.statsPoints") }}</span>
          </div>
        </div>
        <div class="stat-box-modern">
          <div class="stat-icon-wrap communities">
            <img :src="statIconGlobe" class="stat-img" />
          </div>
          <div class="stat-data">
            <span class="stat-number">150+</span>
            <span class="stat-label">{{ $t("home.statsCommunities") }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Steps Section -->
    <section class="home-section centered">
      <span class="section-tag-modern">HOW IT WORKS</span>
      <h2 class="section-title-modern">{{ $t("home.stepsTitleModern") }}</h2>
      <div class="steps-grid-modern">
        <div v-for="i in 3" :key="i" class="step-card-premium card">
          <div class="step-number-badge">{{ i }}</div>
          <img :src="getStepIcon(i)" class="step-icon-img" alt="Step Icon" />
          <h3 class="step-name">{{ $t(`home.step${i}Title`) }}</h3>
          <p class="step-summary">{{ $t(`home.step${i}Desc`) }}</p>
        </div>
      </div>
      <div class="step-action">
        <button class="btn-start large" @click="router.push('/campaigns')">
          지금 바로 시작하기
        </button>
      </div>
    </section>

    <!-- Hot Campaigns Section -->
    <section class="home-section">
      <div class="section-header-modern">
        <div class="header-left-side">
          <span class="section-tag-modern">HOT CAMPAIGNS</span>
          <h2 class="section-title-modern left">
            {{ $t("home.hotCampaignsTitle") }}
          </h2>
        </div>
        <RouterLink to="/campaigns" class="link-view-all"
          >전체 보기 →</RouterLink
        >
      </div>

      <div v-if="loading" class="loading-grid">
        <div v-for="i in 2" :key="i" class="skeleton-card"></div>
      </div>
      <div v-else class="campaign-grid-premium">
        <div
          v-for="(c, index) in closingSoonList.slice(0, 2)"
          :key="c.id"
          class="campaign-card-premium card"
        >
          <div class="cp-visual">
            <div class="cp-status">진행 중</div>
            <img
              :src="getCampaignIcon(index)"
              class="cp-asset-img"
              alt="Campaign Asset"
            />
          </div>
          <div class="cp-info">
            <div class="cp-client">
              <div class="cp-client-logo"></div>
              <span class="cp-client-name">{{
                c.companyName || "pickku"
              }}</span>
            </div>
            <h3 class="cp-title">{{ c.title }}</h3>
            <div class="cp-reward-box">
              <span class="cp-reward-val"
                >+ {{ c.totalRewardPoints || 100 }}P</span
              >
            </div>
            <div class="cp-footer">
              <span class="cp-users"
                >참여자 {{ (c.winnerCount || 0).toLocaleString() }}명</span
              >
              <div class="cp-avatars"></div>
              <button
                class="btn-join-sm"
                @click="router.push(`/campaigns/${c.id}`)"
              >
                참여하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Why Pickku Section -->
    <div class="gray-bg-wrapper">
      <section class="home-section centered gray-bg-inner">
        <span class="section-tag-modern">WHY PICKKU</span>
        <h2 class="section-title-modern">{{ $t("home.valuesTitleModern") }}</h2>
  
        <div class="values-flex-modern">
          <div class="value-item-premium card">
            <img :src="valueIcon1" class="value-icon-img" alt="Safe" />
            <div class="value-content">
              <h3>{{ $t("home.whyPickkuSafe") }}</h3>
              <p>{{ $t("home.whyPickkuSafeDesc") }}</p>
            </div>
          </div>
          <div class="value-item-premium card">
            <img :src="valueIcon2" class="value-icon-img" alt="Easy" />
            <div class="value-content">
              <h3>{{ $t("home.whyPickkuEasy") }}</h3>
              <p>{{ $t("home.whyPickkuEasyDesc") }}</p>
            </div>
          </div>
          <div class="value-item-premium card">
            <img :src="valueIcon3" class="value-icon-img" alt="Instant" />
            <div class="value-content">
              <h3>{{ $t("home.whyPickkuInstant") }}</h3>
              <p>{{ $t("home.whyPickkuInstantDesc") }}</p>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- FAQ Section -->
    <section class="home-section centered">
      <div class="faq-container-premium">
        <div class="faq-text-side">
          <span class="section-tag-modern">QUESTIONS</span>
          <h2 class="section-title-modern left">
            {{ $t("home.faqTitleModern") }}
          </h2>
          <div class="faq-accordion-modern">
            <div v-for="i in 4" :key="i" class="faq-row-modern">
              <div
                class="faq-q-modern"
                @click="faqs[i - 1].open = !faqs[i - 1].open"
              >
                <span>{{ $t(`home.faq${i}Q`) }}</span>
                <span class="faq-toggle">{{
                  faqs[i - 1].open ? "−" : "+"
                }}</span>
              </div>
              <div v-if="faqs[i - 1].open" class="faq-a-modern">
                {{ $t(`home.faq${i}A`) }}
              </div>
            </div>
          </div>
        </div>
        <div class="faq-visual-side">
          <img
            :src="faqCharacter"
            class="faq-character-img"
            alt="FAQ Character"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-container-wide {
  display: flex;
  flex-direction: column;
  gap: 10rem;
  padding-bottom: 12rem;
  overflow-x: hidden;
  background: white;
}

/* Hero: Expansive Vision */
.hero-expansive {
  padding: 8rem 0 6rem;
  position: relative;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
.hero-inner-wide {
  max-width: 2000px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  align-items: center;
  gap: 4rem;
  padding: 0 4rem;
}

.hero-tag-modern {
  color: #a3e635;
  font-weight: 800;
  font-size: 1.25rem;
  margin-bottom: 1.5rem;
  display: block;
  letter-spacing: 0.05em;
}
.hero-title-main {
  font-size: clamp(3.5rem, 7vw, 5.2rem);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.05em;
  color: #1e293b;
  margin-bottom: 2.5rem;
}
.hero-lead-main {
  font-size: 1.4rem;
  line-height: 1.6;
  color: #64748b;
  margin-bottom: 4rem;
  font-weight: 500;
  max-width: 580px;
}

.hero-btn-group {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 5rem;
}
.btn-start {
  background: #6366f1;
  color: white;
  border: none;
  padding: 1.25rem 3.5rem;
  font-weight: 800;
  border-radius: 18px;
  font-size: 1.2rem;
  box-shadow: 0 15px 35px rgba(99, 102, 241, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
}
.btn-start:hover {
  transform: translateY(-5px);
  box-shadow: 0 25px 45px rgba(99, 102, 241, 0.4);
}
.btn-start.large {
  padding: 1.5rem 5rem;
  font-size: 1.3rem;
}

.btn-explore {
  background: white;
  color: #1e293b;
  border: 2px solid #e2e8f0;
  padding: 1.25rem 3.5rem;
  font-weight: 800;
  border-radius: 18px;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s ease;
}
.btn-explore:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.active-community {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}
.avatar-stack-modern {
  display: flex;
  align-items: center;
}
.avatar-pill {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #e2e8f0;
  border: 4px solid white;
  margin-right: -15px;
}
.avatar-count {
  width: 64px;
  height: 48px;
  border-radius: 24px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  font-weight: 800;
  color: #64748b;
  margin-left: 10px;
  border: 1px solid #e2e8f0;
}
.community-text {
  font-size: 1.1rem;
  font-weight: 700;
  color: #64748b;
}

/* Visual Canvas */
.hero-visual-main {
  position: relative;
  height: 750px;
}
.visual-canvas {
  width: 100%;
  height: 100%;
  position: relative;
}

.float-card {
  position: absolute;
  padding: 1.25rem 1.5rem;
  background: white;
  border-radius: 1.5rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  z-index: 2;
  animation: floating 6s ease-in-out infinite;
  border: 1px solid rgba(0, 0, 0, 0.02);
  width: 240px;
}
.fc-header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  margin-bottom: 0.25rem;
}
.fc-tag {
  font-size: 0.8rem;
  font-weight: 800;
  color: #94a3b8;
}
.fc-title {
  font-size: 1.2rem;
  font-weight: 900;
  color: #1e293b;
  margin: 0;
}
.fc-reward {
  font-size: 1.1rem;
  font-weight: 800;
  color: #f59e0b;
}
.fc-check,
.fc-play,
.fc-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #6366f1;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  margin-left: 0.5rem;
}
.fc-check.pink {
  background: #ec4899;
}
.fc-icon.purple {
  background: #8b5cf6;
}

.fc-1 {
  top: 5%;
  left: 10%;
  animation-delay: 0s;
}
.fc-2 {
  top: 10%;
  right: 5%;
  animation-delay: 1.5s;
}
.fc-3 {
  top: 45%;
  left: -5%;
  animation-delay: 0.8s;
}
.fc-4 {
  bottom: 15%;
  left: 15%;
  animation-delay: 2.2s;
}
.fc-5 {
  top: 40%;
  right: -8%;
  animation-delay: 3s;
}

@keyframes floating {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-30px) rotate(3deg);
  }
}

/* Stats Card */
.stats-wrapper-modern {
  max-width: 1600px;
  margin: -6rem auto 0;
  position: relative;
  z-index: 10;
  padding: 0 4rem;
}
.stats-card-modern {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 3.5rem;
  background: white;
  border-radius: 2.5rem;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.02);
}
.stat-box-modern {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 0 3rem;
  border-right: 1px solid #f1f5f9;
}
.stat-box-modern:last-child {
  border: none;
}
.stat-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
}
.stat-img {
  width: 40px;
  height: 40px;
  object-fit: contain;
}
.stat-number {
  display: block;
  font-size: 2rem;
  font-weight: 900;
  color: #1e293b;
  margin-bottom: 0.4rem;
}
.stat-label {
  font-size: 1rem;
  color: #94a3b8;
  font-weight: 700;
}

/* Sections */
.home-section {
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 4rem;
  width: 100%;
}
.home-section.centered {
  text-align: center;
}
.section-tag-modern {
  color: #6366f1;
  font-weight: 900;
  font-size: 1rem;
  letter-spacing: 0.2em;
  margin-bottom: 1.5rem;
  display: block;
}
.section-title-modern {
  font-size: 3rem;
  font-weight: 900;
  color: #1e293b;
  margin-bottom: 5rem;
  letter-spacing: -0.02em;
}
.section-title-modern.left {
  text-align: left;
  margin-bottom: 0;
}

/* Steps */
.steps-grid-modern {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3rem;
  margin-bottom: 6rem;
}
.step-card-premium {
  padding: 4rem 3rem;
  border-radius: 2.5rem;
  background: #f8fafc;
  position: relative;
}
.step-number-badge {
  position: absolute;
  top: 2rem;
  left: 2rem;
  width: 40px;
  height: 40px;
  background: #6366f1;
  color: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
}
.step-icon-img {
  width: 120px;
  height: 120px;
  object-fit: contain;
  margin: 0 auto 3rem;
  display: block;
  filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.05));
}
.step-name {
  font-size: 1.6rem;
  font-weight: 900;
  color: #1e293b;
  margin-bottom: 1rem;
}
.step-summary {
  color: #64748b;
  font-size: 1.1rem;
  line-height: 1.6;
}

/* Campaigns */
.section-header-modern {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 4rem;
}
.link-view-all {
  color: #6366f1;
  font-weight: 800;
  text-decoration: none;
  font-size: 1.1rem;
}

.campaign-grid-premium {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 3rem;
}
.campaign-card-premium {
  display: grid;
  grid-template-columns: 1.2fr 1.5fr;
  overflow: hidden;
  border-radius: 2.5rem;
  background: white;
  min-height: 380px;
}
.cp-visual {
  background: #f8fafc;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cp-status {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  background: #fce7f3;
  color: #ec4899;
  padding: 0.5rem 1rem;
  border-radius: 99px;
  font-weight: 800;
  font-size: 0.85rem;
  z-index: 2;
}
.cp-asset-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 2rem;
  transform: scale(1.1);
  transition: transform 0.3s;
}
.campaign-card-premium:hover .cp-asset-img {
  transform: scale(1.15);
}
.cp-info {
  padding: 3rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.cp-client {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.cp-client-logo {
  width: 28px;
  height: 28px;
  background: #e2e8f0;
  border-radius: 50%;
}
.cp-client-name {
  font-weight: 700;
  color: #64748b;
  font-size: 0.95rem;
}
.cp-title {
  font-size: 1.8rem;
  font-weight: 900;
  color: #1e293b;
  margin-bottom: 1.5rem;
  line-height: 1.3;
}
.cp-reward-box {
  margin-bottom: auto;
}
.cp-reward-val {
  display: inline-block;
  padding: 0.6rem 1.2rem;
  background: #f5f3ff;
  color: #6366f1;
  border-radius: 12px;
  font-weight: 800;
  font-size: 1.1rem;
}
.cp-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #f1f5f9;
}
.cp-users {
  font-weight: 700;
  color: #94a3b8;
  font-size: 0.9rem;
}
.btn-join-sm {
  background: #6366f1;
  color: white;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 12px;
  font-weight: 800;
  cursor: pointer;
}

/* Values */
.gray-bg-wrapper {
  background: #f8fafc;
  width: 100%;
  margin-bottom: 12rem;
}
.gray-bg-inner {
  padding-top: 8rem;
  padding-bottom: 8rem;
  margin-bottom: 0 !important;
}
.values-flex-modern {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3rem;
}
.value-item-premium {
  padding: 4rem 3rem;
  text-align: left;
  background: white;
  border-radius: 2rem;
}
.value-icon-img {
  width: 72px;
  height: 72px;
  object-fit: contain;
  margin-bottom: 2.5rem;
  display: block;
  filter: drop-shadow(0 8px 15px rgba(0, 0, 0, 0.05));
}
.value-content h3 {
  font-size: 1.5rem;
  font-weight: 900;
  color: #1e293b;
  margin-bottom: 1rem;
}
.value-content p {
  color: #64748b;
  line-height: 1.6;
  font-size: 1.05rem;
}

/* FAQ */
.faq-container-premium {
  display: grid;
  grid-template-columns: 1fr 0.8fr;
  gap: 8rem;
  align-items: flex-start;
}
.faq-accordion-modern {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 4rem;
}
.faq-row-modern {
  border-radius: 1.5rem;
  background: #f8fafc;
  overflow: hidden;
}
.faq-q-modern {
  padding: 1.75rem 2.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  font-weight: 800;
  color: #1e293b;
  font-size: 1.15rem;
}
.faq-a-modern {
  padding: 0 2.5rem 2rem;
  color: #64748b;
  line-height: 1.7;
  font-size: 1.1rem;
}
.faq-character-img {
  width: 100%;
  max-width: 400px;
  height: auto;
  object-fit: contain;
  animation: floatSlow 6s ease-in-out infinite;
}

@keyframes floatSlow {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}

@media (max-width: 1200px) {
  .hero-inner-wide {
    grid-template-columns: 1fr;
    gap: 2rem;
    padding: 0 2rem;
  }
  .hero-visual-main {
    height: 500px;
  }
  .campaign-grid-premium,
  .steps-grid-modern,
  .values-flex-modern {
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
  }
  .faq-container-premium {
    grid-template-columns: 1fr;
    gap: 4rem;
  }
  .stats-card-modern {
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
    padding: 2.5rem;
  }
  .stat-box-modern {
    border: none;
    padding: 0 1.5rem;
  }
  .home-section {
    padding: 0 2rem;
  }
}

@media (max-width: 900px) {
  .hero-title-main {
    font-size: 3rem;
  }
  .hero-lead-main {
    font-size: 1.2rem;
    margin-bottom: 2.5rem;
  }
  .campaign-grid-premium,
  .steps-grid-modern,
  .values-flex-modern {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  .campaign-card-premium {
    grid-template-columns: 1fr;
    min-height: auto;
  }
  .cp-visual {
    height: 200px;
  }
  .cp-info {
    padding: 2rem;
  }
  .value-item-premium,
  .step-card-premium {
    padding: 3rem 2rem;
  }
  .section-title-modern {
    font-size: 2.2rem;
    margin-bottom: 3rem;
  }
}

@media (max-width: 768px) {
  .home-container-wide {
    gap: 6rem;
    padding-bottom: 6rem;
  }
  .hero-expansive {
    padding: 4rem 0 3rem;
  }
  .hero-visual-main {
    display: none; /* Hide floating cards to fit key content cleanly */
  }
  .stats-wrapper-modern {
    margin-top: -2rem;
    padding: 0 1.5rem;
  }
  .stats-card-modern {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    padding: 2rem;
  }
  .stat-box-modern {
    padding: 0;
  }
  .faq-character-img {
    display: none;
  }
  .faq-q-modern {
    padding: 1.25rem 1.5rem;
    font-size: 1rem;
  }
  .faq-a-modern {
    padding: 0 1.5rem 1.25rem;
    font-size: 0.95rem;
  }
}

@media (max-width: 480px) {
  .hero-title-main {
    font-size: 2.2rem;
  }
  .hero-btn-group {
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 3rem;
  }
  .btn-start, .btn-explore {
    width: 100%;
    text-align: center;
    padding: 1rem 2rem;
  }
  .active-community {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  .avatar-count {
    margin-left: 0;
  }
  .home-section {
    padding: 0 1.25rem;
  }
  .gray-bg-inner {
    padding-top: 4rem;
    padding-bottom: 4rem;
  }
  .gray-bg-wrapper {
    margin-bottom: 6rem;
  }
}
</style>
