<script setup lang="ts">
import { onMounted, ref, computed, nextTick } from "vue";
import { useRouter } from "vue-router";
import { api, getFileUrl } from "../api/client";
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
import cpAsset3 from "../assets/new_icon_7.png";
import cpAsset4 from "../assets/new_icon_6.png";
import cpAsset5 from "../assets/new_icon_12.png";
import cpAsset6 from "../assets/new_icon_10.png";
import statIconMissions from "../assets/new_icon_7.png";
import statIconPoints from "../assets/new_icon_6.png";
import statIconGlobe from "../assets/new_icon_8.png";
import kakaoCard1 from "../assets/KakaoTalk_20260519_105338133.png";
import kakaoCard2 from "../assets/KakaoTalk_20260519_105338133_01.png";
import kakaoCard3 from "../assets/KakaoTalk_20260519_105338133_02.png";
import kakaoCard4 from "../assets/KakaoTalk_20260519_105338133_03.png";
import kakaoCard5 from "../assets/KakaoTalk_20260519_105338133_04.png";

const getStepIcon = (i: number) => {
  if (i === 1) return stepIcon1;
  if (i === 2) return stepIcon2;
  return stepIcon3;
};

type Campaign = {
  id: string;
  title: string;
  description: string;
  companyName: string;
  companyLogoUrl: string;
  rewardImageUrl?: string;
  status: string;
  winnerCount: number;
  totalRewardPoints: number;
  rewardCurrency: string;
  rewardsConfig: string;
  startsAt: string | null;
  endsAt: string | null;
  drawAt?: string | null;
  missions?: { id: string }[];
};

const getStatusType = (c: Campaign) => {
  if (c.status !== "ACTIVE") return "CLOSED";
  if (c.startsAt && new Date(c.startsAt) > new Date()) return "UPCOMING";
  if (c.endsAt) {
    const diff = new Date(c.endsAt).getTime() - Date.now();
    if (diff > 0 && diff < 3 * 24 * 60 * 60 * 1000) return "ENDING_SOON";
  }
  return "ACTIVE";
};

const getBrandTheme = (companyName: string) => {
  const name = (companyName || "").toLowerCase();
  if (name.includes("스타벅스") || name.includes("starbucks")) {
    return {
      bg: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
      btnBg: "#7c3aed",
      badgeBg: "#ecfdf5",
      badgeTextColor: "#059669",
      textColor: "#7c3aed",
      logoBg: "#00704a",
      logoEmoji: "☕",
      btnText: "참여하기",
      illustration: "coffee"
    };
  }
  if (name.includes("올리브영") || name.includes("olive")) {
    return {
      bg: "linear-gradient(135deg, #fffbeb 0%, #fff7ed 100%)",
      btnBg: "#ea580c",
      badgeBg: "#ffedd5",
      badgeTextColor: "#ea580c",
      textColor: "#ea580c",
      logoBg: "#9db826",
      logoEmoji: "🌿",
      btnText: "응모하기",
      illustration: "voucher"
    };
  }
  if (name.includes("배달") || name.includes("배민") || name.includes("baemin")) {
    return {
      bg: "linear-gradient(135deg, #ecfeff 0%, #e0f2fe 100%)",
      btnBg: "#06b6d4",
      badgeBg: "#cffafe",
      badgeTextColor: "#0891b2",
      textColor: "#0891b2",
      logoBg: "#2ac1bc",
      logoEmoji: "🛵",
      btnText: "참여하기",
      illustration: "coin"
    };
  }
  if (name.includes("cu") || name.includes("씨유")) {
    return {
      bg: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)",
      btnBg: "#8b5cf6",
      badgeBg: "#f3e8ff",
      badgeTextColor: "#7c3aed",
      textColor: "#7c3aed",
      logoBg: "#5c2e91",
      logoEmoji: "🏪",
      btnText: "응모하기",
      illustration: "coupon"
    };
  }
  if (name.includes("네이버페이") || name.includes("naver") || name.includes("네이버")) {
    return {
      bg: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
      btnBg: "#10b981",
      badgeBg: "#dcfce7",
      badgeTextColor: "#059669",
      textColor: "#059669",
      logoBg: "#03cf5d",
      logoEmoji: "💚",
      btnText: "참여하기",
      illustration: "nbox"
    };
  }
  if (name.includes("교보") || name.includes("kyobo")) {
    return {
      bg: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
      btnBg: "#3b82f6",
      badgeBg: "#dbeafe",
      badgeTextColor: "#1d4ed8",
      textColor: "#2563eb",
      logoBg: "#1a5447",
      logoEmoji: "📚",
      btnText: "참여하기",
      illustration: "book"
    };
  }
  return {
    bg: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
    btnBg: "#6366f1",
    badgeBg: "#e0e7ff",
    badgeTextColor: "#4f46e5",
    textColor: "#4f46e5",
    logoBg: "#6366f1",
    logoEmoji: "🎁",
    btnText: "참여하기",
    illustration: "default"
  };
};

const getCampaignIllustration = (c: Campaign, idx: number) => {
  if (c.rewardImageUrl) return getFileUrl(c.rewardImageUrl);
  
  const name = (c.companyName || "").toLowerCase();
  if (name.includes("스타벅스") || name.includes("starbucks")) return cpAsset1;
  if (name.includes("올리브영") || name.includes("olive")) return cpAsset2;
  if (name.includes("배달") || name.includes("배민") || name.includes("baemin")) return cpAsset3;
  if (name.includes("cu") || name.includes("씨유")) return cpAsset4;
  if (name.includes("네이버") || name.includes("naver")) return cpAsset5;
  if (name.includes("교보") || name.includes("kyobo")) return cpAsset6;
  
  const type = getStatusType(c);
  if (type === "UPCOMING") return cpAsset5;
  if (type === "CLOSED") return cpAsset4;
  
  const assets = [cpAsset1, cpAsset2, cpAsset3, cpAsset4, cpAsset5, cpAsset6];
  return assets[idx % assets.length];
};

const getDDay = (endsAt: string | null) => {
  if (!endsAt) return "D-3";
  const end = new Date(endsAt);
  const now = new Date();
  const endZero = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const nowZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = endZero.getTime() - nowZero.getTime();
  if (diffTime < 0) return "종료";
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "D-Day";
  return `D-${diffDays}`;
};



const hasFinancialRewards = (c: Campaign) => {
  if (c.rewardsConfig && c.rewardsConfig !== "[]") {
    try {
      const parsed = JSON.parse(c.rewardsConfig);
      if (Array.isArray(parsed)) {
        return parsed.some(r => r.currency !== 'OTHER');
      }
    } catch (e) {
      console.error(e);
    }
  }
  return (c.totalRewardPoints || 0) > 0;
};

const getFinancialRewardsList = (c: Campaign) => {
  if (c.rewardsConfig && c.rewardsConfig !== "[]") {
    try {
      const parsed = JSON.parse(c.rewardsConfig);
      if (Array.isArray(parsed)) {
        return parsed.filter(r => r.currency !== 'OTHER');
      }
    } catch (e) {
      console.error(e);
    }
  }
  if ((c.totalRewardPoints || 0) > 0) {
    return [{ currency: c.rewardCurrency || 'POINT', amount: c.totalRewardPoints }];
  }
  return [];
};

const hasOtherRewards = (c: Campaign) => {
  if (c.rewardsConfig && c.rewardsConfig !== "[]") {
    try {
      const parsed = JSON.parse(c.rewardsConfig);
      if (Array.isArray(parsed)) {
        return parsed.some(r => r.currency === 'OTHER');
      }
    } catch (e) {
      console.error(e);
    }
  }
  return false;
};

const getOtherRewardsList = (c: Campaign) => {
  if (c.rewardsConfig && c.rewardsConfig !== "[]") {
    try {
      const parsed = JSON.parse(c.rewardsConfig);
      if (Array.isArray(parsed)) {
        return parsed.filter(r => r.currency === 'OTHER');
      }
    } catch (e) {
      console.error(e);
    }
  }
  return [];
};

const getCurrencyEmoji = (currency: string) => {
  const c = (currency || '').toUpperCase();
  if (c === 'POINT' || c === 'P') return '🪙';
  if (c === 'USDT') return '💵';
  if (c === 'METAQ') return '💎';
  if (c === 'BRL') return '🇧🇷';
  return '🎁';
};

const formatRewardText = (r: any, c: Campaign) => {
  const perPerson = Math.floor(r.amount / (c.winnerCount || 1));
  return `${r.currency === 'POINT' || r.currency === 'P' ? '포인트' : r.currency} ${perPerson.toLocaleString()}${r.currency === 'POINT' || r.currency === 'P' ? 'P' : ' ' + r.currency}`;
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

  // Wait until DOM is fully updated and ref is correctly bound
  await nextTick();

  // Intersection Observer to trigger count-up animation ONLY when scrolled into viewport
  if (window.IntersectionObserver && statsCardRef.value) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          runCountUp();
          observer.disconnect();
        }
      });
    }, { 
      threshold: 0.15, // Trigger when 15% of the stats card enters the screen
      rootMargin: "0px 0px -30px 0px" // Trigger slightly above the bottom boundary for perfect viewing
    });

    observer.observe(statsCardRef.value);
  } else {
    // Immediate fallback only if the browser does not support Intersection Observer
    runCountUp();
  }
});



const faqs = ref([
  { q: t("home.faq1Q"), a: t("home.faq1A"), open: false },
  { q: t("home.faq2Q"), a: t("home.faq2A"), open: false },
  { q: t("home.faq3Q"), a: t("home.faq3A"), open: false },
  { q: t("home.faq4Q"), a: t("home.faq4A"), open: false },
]);

// Stats Card Count-Up Animation
const statsCardRef = ref<HTMLElement | null>(null);
const activeUsers = ref(0);
const missionsCompleted = ref(0);
const pointsDistributed = ref(0);
const communitiesCount = ref(0);
const animated = ref(false);

const easeOutQuad = (x: number): number => {
  return 1 - (1 - x) * (1 - x);
};

const formatStat = (val: number): string => {
  if (val >= 1000000) {
    const mValue = val / 1000000;
    const formatted = mValue % 1 === 0 ? mValue.toFixed(0) : mValue.toFixed(1);
    return `${formatted}M+`;
  }
  if (val >= 1000) {
    const kValue = val / 1000;
    const formatted = kValue % 1 === 0 ? kValue.toFixed(0) : kValue.toFixed(1);
    return `${formatted}K+`;
  }
  return `${Math.floor(val)}+`;
};

const runCountUp = () => {
  if (animated.value) return;
  animated.value = true;

  const duration = 1500; // 1.5s duration
  const startTime = performance.now();

  const targets = {
    users: 320000,
    missions: 1500000,
    points: 7800000,
    communities: 150
  };

  const step = (now: number) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = easeOutQuad(progress);

    activeUsers.value = Math.floor(easeProgress * targets.users);
    missionsCompleted.value = Math.floor(easeProgress * targets.missions);
    pointsDistributed.value = Math.floor(easeProgress * targets.points);
    communitiesCount.value = Math.floor(easeProgress * targets.communities);

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      activeUsers.value = targets.users;
      missionsCompleted.value = targets.missions;
      pointsDistributed.value = targets.points;
      communitiesCount.value = targets.communities;
    }
  };

  requestAnimationFrame(step);
};

const popularCampaigns = computed(() => {
  return [...list.value]
    .sort((a, b) => (b.winnerCount || 0) - (a.winnerCount || 0))
    .slice(0, 10);
});

const viewportRef = ref<HTMLElement | null>(null);

const slideLeft = () => {
  if (viewportRef.value) {
    viewportRef.value.scrollBy({ left: -viewportRef.value.offsetWidth, behavior: "smooth" });
  }
};

const slideRight = () => {
  if (viewportRef.value) {
    viewportRef.value.scrollBy({ left: viewportRef.value.offsetWidth, behavior: "smooth" });
  }
};
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
              <img :src="kakaoCard1" alt="Social Mission" class="fc-img" />
            </div>
            <div class="float-card fc-2">
              <img :src="kakaoCard2" alt="Daily Mission" class="fc-img" />
            </div>
            <div class="float-card fc-3">
              <img :src="kakaoCard3" alt="Content Mission" class="fc-img" />
            </div>
            <div class="float-card fc-4">
              <img :src="kakaoCard4" alt="Engagement Mission" class="fc-img" />
            </div>
            <div class="float-card fc-5">
              <img :src="kakaoCard5" alt="Quiz Mission" class="fc-img" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats Section (Full Width Card) -->
    <div class="stats-wrapper-modern">
      <div ref="statsCardRef" class="stats-card-modern">
        <div class="stat-box-modern">
          <div class="stat-icon-wrap users">👥</div>
          <div class="stat-data">
            <span class="stat-number">{{ formatStat(activeUsers) }}</span>
            <span class="stat-label">{{ $t("home.statsActiveUsers") }}</span>
          </div>
        </div>
        <div class="stat-box-modern">
          <div class="stat-icon-wrap missions">
            <img :src="statIconMissions" class="stat-img" />
          </div>
          <div class="stat-data">
            <span class="stat-number">{{ formatStat(missionsCompleted) }}</span>
            <span class="stat-label">{{ $t("home.statsMissions") }}</span>
          </div>
        </div>
        <div class="stat-box-modern">
          <div class="stat-icon-wrap points">
            <img :src="statIconPoints" class="stat-img" />
          </div>
          <div class="stat-data">
            <span class="stat-number">{{ formatStat(pointsDistributed) }}</span>
            <span class="stat-label">{{ $t("home.statsPoints") }}</span>
          </div>
        </div>
        <div class="stat-box-modern">
          <div class="stat-icon-wrap communities">
            <img :src="statIconGlobe" class="stat-img" />
          </div>
          <div class="stat-data">
            <span class="stat-number">{{ formatStat(communitiesCount) }}</span>
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
    </section>

    <!-- Hot Campaigns Section -->
    <section class="home-section popular-slider-section">
      <div class="section-header-modern">
        <div class="header-left-side">
          <span class="section-tag-modern">HOT CAMPAIGNS</span>
          <div class="slider-title-wrap">
            <span class="fire-emoji">🔥</span>
            <h2 class="section-title-modern left">
              {{ $t("home.hotCampaignsTitle") }}
            </h2>
          </div>
        </div>
        <div class="slider-nav-btns" v-if="popularCampaigns.length > 0">
          <button class="nav-btn prev" @click="slideLeft" aria-label="이전 캠페인">⟨</button>
          <button class="nav-btn next" @click="slideRight" aria-label="다음 캠페인">⟩</button>
        </div>
      </div>

      <div v-if="loading" class="loading-grid">
        <div v-for="i in 3" :key="i" class="skeleton-card"></div>
      </div>
      <div v-else-if="popularCampaigns.length === 0" class="empty-msg-home">
        등록된 캠페인이 존재하지 않습니다.
      </div>
      <div v-else class="slider-viewport" ref="viewportRef">
        <div
          v-for="(c, index) in popularCampaigns"
          :key="c.id"
          class="campaign-card-premium card popular-card-item"
          :class="{ 'card-inactive': getStatusType(c) === 'CLOSED' }"
          :style="{
            background: getBrandTheme(c.companyName).bg,
            borderColor: getBrandTheme(c.companyName).textColor + '25',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.02)'
          }"
          @click="router.push(`/campaigns/${c.id}`)"
        >
          <!-- Brand Header (Circular brand logo, brand name, D-day badge) -->
          <div class="card-brand-header">
            <div class="company-brand-info">
              <img v-if="c.companyLogoUrl" :src="getFileUrl(c.companyLogoUrl)" class="brand-logo-circular" alt="" />
              <div v-else class="brand-logo-fallback" :style="{ background: getBrandTheme(c.companyName).btnBg }">
                {{ getBrandTheme(c.companyName).logoEmoji }}
              </div>
              <span class="company-name-txt">{{ c.companyName || 'pickku' }}</span>
            </div>
            <div class="dday-pill-badge" :style="{ color: getBrandTheme(c.companyName).btnBg }">
              🕒 {{ getDDay(c.endsAt) }}
            </div>
          </div>

          <!-- Title -->
          <h2 class="campaign-card-title">{{ c.title }}</h2>

          <!-- Body Content (Left column: Reward badge + text; Right column: 3D Illustration) -->
          <div class="card-body-content">
            <div class="reward-details-col">
              <div class="reward-label-badge" :style="{ background: getBrandTheme(c.companyName).badgeBg, color: getBrandTheme(c.companyName).badgeTextColor }">
                보상
              </div>
              
              <!-- Row 1: Financial Rewards (POINT, USDT, BRL, METAQ) -->
              <div v-if="hasFinancialRewards(c)" class="reward-row-wrap financial-row">
                <div class="reward-scroll-container">
                  <div class="reward-scroll-track" :class="{ 'marquee-active': getFinancialRewardsList(c).length > 1 }" :style="{ '--marquee-duration': (getFinancialRewardsList(c).length * 5) + 's' }">
                    <!-- First set -->
                    <div 
                      v-for="(r, rIdx) in getFinancialRewardsList(c)" 
                      :key="'f1-' + rIdx" 
                      class="reward-wrap"
                    >
                      <span class="coin-icon">{{ getCurrencyEmoji(r.currency) }}</span>
                      <span class="reward-val">{{ formatRewardText(r, c) }}</span>
                    </div>
                    <!-- Duplicated set for seamless marquee loop (only when count > 1) -->
                    <template v-if="getFinancialRewardsList(c).length > 1">
                      <div 
                        v-for="(r, rIdx) in getFinancialRewardsList(c)" 
                        :key="'f2-' + rIdx" 
                        class="reward-wrap"
                      >
                        <span class="coin-icon">{{ getCurrencyEmoji(r.currency) }}</span>
                        <span class="reward-val">{{ formatRewardText(r, c) }}</span>
                      </div>
                    </template>
                  </div>
                </div>
              </div>

              <!-- Row 2: Other Rewards (OTHER) -->
              <div v-if="hasOtherRewards(c)" class="reward-row-wrap other-row">
                <div v-for="(r, rIdx) in getOtherRewardsList(c)" :key="'o-' + rIdx" class="reward-text-desc">
                  {{ r.customCurrency || '기타 보상' }}
                </div>
              </div>
            </div>
            <div class="card-right-visual">
              <img
                :src="getCampaignIllustration(c, index)"
                class="visual-right-img"
                alt="Campaign Illustration"
              />
            </div>
          </div>

          <!-- Footer Row -->
          <div class="card-footer-row">
            <div class="participants-count-wrap" :style="{ color: getBrandTheme(c.companyName).textColor }">
              <span class="part-icon">👤</span>
              <span class="part-text">{{ c.winnerCount }}명</span>
            </div>
            <button class="action-pill-btn" :style="{ background: getBrandTheme(c.companyName).btnBg }">
              {{ getBrandTheme(c.companyName).btnText }} <span class="chevron">></span>
            </button>
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
              <div
                class="faq-a-modern"
                :class="{ 'is-open': faqs[i - 1].open }"
              >
                <div class="faq-a-inner">
                  {{ $t(`home.faq${i}A`) }}
                </div>
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
  background: var(--bg);
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
  max-width: 2400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  align-items: center;
  gap: 4rem;
  padding: 0 4rem;
}

.hero-tag-modern {
  color: #22c55e !important;
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
  color: #1e1e2f !important;
  margin-bottom: 2.5rem;
  text-shadow:
    0 2px 12px rgba(255, 255, 255, 0.75),
    0 1px 2px rgba(0, 0, 0, 0.05);
}
.hero-title-main :deep(.text-indigo) {
  color: #6c63ff !important;
}
.hero-title-main :deep(.text-green) {
  color: #1e1e2f !important;
}
.hero-lead-main {
  font-size: 1.4rem;
  line-height: 1.6;
  color: rgba(30, 30, 47, 0.85) !important;
  margin-bottom: 4rem;
  font-weight: 600; /* Increased font weight to 600 for better visibility */
  max-width: 580px;
  text-shadow:
    0 2px 15px rgba(255, 255, 255, 0.95),
    0 1px 5px rgba(255, 255, 255, 0.95),
    0 0 30px rgba(255, 255, 255, 0.6);
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
  z-index: 2;
  animation: floating 6s ease-in-out infinite;
  width: 240px;
}

.fc-img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 1.5rem;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.08);
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
  top: 50%;
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
  font-variant-numeric: tabular-nums;
  min-width: 140px; /* 고정 최소 너비 지정으로 카운트업 시 컬럼 넓이 고정 */
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
  background: white;
  border-radius: 1.75rem;
  border: 1.5px solid transparent;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.02);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: space-between;
  padding: 1.6rem 2rem; /* 좌우 패딩을 살짝 추가하여 콘텐츠가 중앙에 모이도록 설정 */
  gap: 0.75rem;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  min-height: 300px;
  cursor: pointer;
  position: relative;
  text-align: left;
}

.campaign-card-premium:not(.card-inactive):hover {
  transform: translateY(-6px);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.08);
}

.card-inactive {
  background: #f8fafc !important;
  border-color: #e2e8f0 !important;
  opacity: 0.75;
}

.card-inactive:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.02);
}

.card-inactive .campaign-card-title {
  color: #94a3b8;
}

.card-inactive .company-name-txt {
  color: #94a3b8;
}

.card-inactive .card-right-visual img {
  filter: grayscale(95%) opacity(0.6);
}

.card-inactive .reward-label-badge {
  background: #f1f5f9 !important;
  color: #94a3b8 !important;
}

.card-inactive .reward-text-desc {
  color: #94a3b8 !important;
}

.card-inactive .action-pill-btn {
  background: #cbd5e1 !important;
  color: #94a3b8 !important;
}

/* Card Left Column Content */
.card-left-content {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-width: 0;
}

/* Card Brand Header & Top Badges */
.card-brand-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 0.25rem;
  gap: 0.5rem;
}

.company-brand-info {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
  flex: 1;
}

.brand-logo-circular {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid white;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
  flex-shrink: 0;
}

.brand-logo-fallback {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
  flex-shrink: 0;
  font-size: 1.1rem;
}

.company-name-txt {
  font-size: 1rem;
  font-weight: 800;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
  letter-spacing: -0.02em;
}

.dday-pill-badge {
  background: white;
  padding: 0.4rem 0.8rem;
  border-radius: 99px;
  font-size: 0.8rem;
  font-weight: 850;
  box-shadow: 0 4px 10px rgba(0,0,0,0.03);
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.campaign-card-title {
  font-size: 1.35rem;
  font-weight: 900;
  color: #1e293b;
  margin: 0 0 1.25rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  height: 3.8rem;
  text-align: left;
}

/* Card Body Content layout */
.card-body-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.reward-details-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.4rem;
  flex: 1;
  min-width: 0;
}

.reward-label-badge {
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 850;
  display: inline-block;
}
.reward-row-wrap {
  display: flex;
  align-items: center;
  width: 100%;
}

.reward-scroll-container {
  overflow: hidden;
  width: 100%;
  position: relative;
}

.reward-scroll-track {
  display: flex;
  gap: 0.5rem;
  width: max-content;
  will-change: transform;
}

.reward-scroll-track.marquee-active {
  animation: none;
}

/* 마우스 호버 시 천천히 반복되는 보상 배지 무한 슬라이드 */
.campaign-card-premium:not(.card-inactive):hover .reward-scroll-track.marquee-active {
  animation: reward-marquee var(--marquee-duration, 10s) linear infinite;
}

@keyframes reward-marquee {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

.reward-wrap {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: #eef2ff;
  padding: 0.35rem 0.75rem;
  border: 1px solid #e0e7ff;
  border-radius: 99px;
  width: fit-content;
  white-space: nowrap;
  flex-shrink: 0;
}

.reward-wrap .coin-icon {
  font-size: 0.95rem;
}

.reward-wrap .reward-val {
  color: #4f46e5;
  font-weight: 800;
  font-size: 0.85rem;
}

.reward-text-desc {
  font-size: 1.15rem;
  font-weight: 850;
  color: #1e293b;
  text-align: left;
  line-height: 1.3;
  white-space: pre-line;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  max-height: 3rem;
}

/* Centered Visual Image */
.card-right-visual {
  width: 130px; /* 보상 이미지 크기를 115px -> 130px로 확대 */
  height: 130px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
}

.visual-right-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.08));
  transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.campaign-card-premium:not(.card-inactive):hover .visual-right-img {
  transform: scale(1.15) rotate(4deg);
}

/* Card Footer Row layout */
.card-footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px dashed rgba(0, 0, 0, 0.06);
  padding-top: 1rem;
  margin-top: auto;
}

.participants-count-wrap {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.9rem;
  font-weight: 750;
}

.part-icon {
  font-size: 1rem;
}

.part-text {
  letter-spacing: -0.01em;
}

.action-pill-btn {
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 99px;
  font-weight: 850;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
}

.action-pill-btn:hover {
  transform: scale(1.05);
}

.chevron {
  font-weight: 900;
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
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  color: #64748b;
  line-height: 1.7;
  font-size: 1.1rem;
  padding: 0 2.5rem;
  transition:
    max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.25s ease,
    padding 0.35s ease;
}
.faq-a-modern.is-open {
  max-height: 250px;
  opacity: 1;
  padding: 0 2.5rem 2rem;
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

@media (max-width: 1024px) {
  .hero-inner-wide {
    grid-template-columns: 1fr;
    gap: 2rem;
    padding: 0 2rem;
    text-align: center;
  }
  .hero-visual-main {
    display: none;
  }
  .hero-lead-main {
    margin-left: auto;
    margin-right: auto;
  }
  .hero-btn-group {
    justify-content: center;
  }
  .active-community {
    justify-content: center;
  }
}

@media (max-width: 900px) {
  .hero-title-main {
    font-size: 3rem;
  }
  .hero-lead-main {
    font-size: 1.2rem;
    margin-bottom: 2.5rem;
    text-shadow:
      0 2px 15px rgba(255, 255, 255, 0.95),
      0 1px 5px rgba(255, 255, 255, 0.95),
      0 0 30px rgba(255, 255, 255, 0.6) !important;
  }
  .campaign-grid-premium,
  .steps-grid-modern,
  .values-flex-modern {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  .campaign-card-premium {
    min-height: auto;
    padding: 1.25rem 1.5rem; /* 모바일 카드 좌우 패딩 상향 조절 */
    gap: 0.75rem;
  }
  .card-right-visual {
    width: 110px; /* 모바일 보상 이미지 크기 95px -> 110px로 확대 */
    height: 110px;
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
  .active-community {
    display: none !important;
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
  .btn-start,
  .btn-explore {
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

/* ==========================================
   ✨ PREMIUM DARK MODE STYLES FOR HOMEPAGE
   ========================================== */

/* 1. Stats Card */
:root.dark .stats-card-modern {
  background: var(--panel) !important;
  border: 1px solid var(--border) !important;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.3) !important;
}
:root.dark .stat-box-modern {
  border-right: 1px solid var(--border) !important;
}
:root.dark .stat-icon-wrap {
  background: var(--code-bg) !important;
}
:root.dark .stat-number {
  color: var(--text-h) !important;
}
:root.dark .stat-label {
  color: var(--muted) !important;
}

/* 2. Steps Section */
:root.dark .section-title-modern {
  color: var(--text-h) !important;
}
:root.dark .step-card-premium {
  background: var(--panel) !important;
  border: 1px solid var(--border) !important;
}
:root.dark .step-name {
  color: var(--text-h) !important;
}
:root.dark .step-summary {
  color: var(--muted) !important;
}

/* 3. Campaign Cards */
:root.dark .campaign-card-premium {
  background: var(--panel) !important;
  border: 1.5px solid var(--border) !important;
  box-shadow: var(--shadow) !important;
}
:root.dark .campaign-card-premium:hover {
  box-shadow: var(--shadow-hover) !important;
}
:root.dark .campaign-card-title {
  color: var(--text-h) !important;
}
:root.dark .card-right-visual {
  background: var(--code-bg) !important;
  border-color: var(--border) !important;
}
:root.dark .reward-label-badge {
  background: var(--code-bg) !important;
  color: var(--muted) !important;
}
:root.dark .reward-text-desc {
  color: var(--text) !important;
}
:root.dark .reward-wrap {
  background: rgba(99, 102, 241, 0.15) !important;
  border-color: rgba(99, 102, 241, 0.3) !important;
}
:root.dark .reward-wrap .reward-val {
  color: #818cf8 !important;
}
:root.dark .upcoming-date-badge {
  background: var(--code-bg) !important;
  border-color: var(--border) !important;
  color: var(--muted) !important;
}
:root.dark .company-name-txt {
  color: var(--muted) !important;
}
:root.dark .empty-msg {
  color: var(--muted) !important;
}

:root.dark .card-inactive {
  background: var(--code-bg) !important;
  border-color: var(--border) !important;
  opacity: 0.65;
}
:root.dark .card-inactive:hover {
  box-shadow: var(--shadow) !important;
  border-color: var(--border) !important;
}
:root.dark .card-inactive .campaign-card-title {
  color: var(--muted) !important;
}
:root.dark .card-inactive .company-name-txt {
  color: rgba(255, 255, 255, 0.2) !important;
}
:root.dark .card-inactive .reward-text-desc {
  color: var(--muted) !important;
}
:root.dark .card-inactive .reward-wrap {
  background: rgba(255, 255, 255, 0.03) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
}
:root.dark .card-inactive .reward-wrap .reward-val {
  color: var(--muted) !important;
}

/* 4. Values Section */
:root.dark .gray-bg-wrapper {
  background: var(
    --bg-deep
  ) !important; /* Deep dark coal space bg instead of bright white */
}
:root.dark .value-item-premium {
  background: var(--panel) !important;
  border: 1px solid var(--border) !important;
}
:root.dark .value-content h3 {
  color: var(--text-h) !important;
}
:root.dark .value-content p {
  color: var(--muted) !important;
}

/* 5. FAQ Section */
:root.dark .faq-row-modern {
  background: var(--panel) !important;
  border: 1px solid var(--border) !important;
}
:root.dark .faq-q-modern {
  color: var(--text-h) !important;
}
:root.dark .faq-a-modern {
  color: var(--muted) !important;
}

/* ==========================================
   🔥 PREMIUM POPULAR CAMPAIGNS SLIDER SECTION
   ========================================== */
.popular-slider-section {
  width: 100%;
}

.slider-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.fire-emoji {
  font-size: 2.2rem;
  animation: fire-bounce 1s ease infinite alternate;
  line-height: 1;
}

@keyframes fire-bounce {
  0% { transform: translateY(0) scale(1); }
  100% { transform: translateY(-4px) scale(1.1); }
}

.slider-nav-btns {
  display: flex;
  gap: 0.75rem;
}

.nav-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--text-h);
  font-size: 1.2rem;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  line-height: 1;
}

.nav-btn:hover {
  background: #6366f1;
  color: white;
  border-color: #6366f1;
  transform: scale(1.08);
}

.nav-btn:active {
  transform: scale(0.95);
}

.slider-viewport {
  display: flex;
  gap: 2.5rem;
  overflow-x: auto;
  scroll-behavior: smooth;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  padding: 0.5rem 0.25rem 1.5rem;
  margin: 0 -0.25rem;
}

/* Hide scrollbars */
.slider-viewport::-webkit-scrollbar {
  display: none;
}

.slider-viewport {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.popular-card-item {
  flex: 0 0 calc(50% - 1.25rem); /* PC/데스크톱에서는 기본 2개씩 스크롤되도록 조정 */
  scroll-snap-align: start;
  min-width: 320px;
}

@media (max-width: 900px) {
  .popular-card-item {
    flex: 0 0 100%;
  }
}

:root.dark .nav-btn {
  background: var(--panel) !important;
  border-color: var(--border) !important;
  color: var(--text-h) !important;
}

:root.dark .nav-btn:hover {
  background: #6366f1 !important;
  color: white !important;
  border-color: #6366f1 !important;
}

.empty-msg-home {
  color: #64748b;
  text-align: center;
  font-size: 1.2rem;
  font-weight: 700;
  padding: 4rem 0;
}
:root.dark .empty-msg-home {
  color: var(--muted) !important;
}
</style>
