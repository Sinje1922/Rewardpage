<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { api, getFileUrl } from "../api/client";

import cpAsset1 from "../assets/new_icon_2.png";
import cpAsset2 from "../assets/new_icon_3.png";
import cpAsset3 from "../assets/new_icon_7.png";
import cpAsset4 from "../assets/new_icon_6.png";
import cpAsset5 from "../assets/new_icon_12.png";
import cpAsset6 from "../assets/new_icon_10.png";


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
  missions?: { id: string; type?: string }[];
};

const router = useRouter();
const { t } = useI18n();
const list = ref<Campaign[]>([]);
const err = ref("");
const searchQuery = ref("");
const filterStatus = ref("ALL");
const filterMissionCategory = ref("ALL");
const sortBy = ref("LATEST");

onMounted(async () => {
  try {
    const { data } = await api.get<Campaign[]>("/campaigns");
    list.value = data;
  } catch {
    err.value = t("campaign.errorLoad");
  }
});

// Helper to determine status type (ACTIVE, ENDING_SOON, CLOSED, UPCOMING)
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

const isFilterPanelOpen = ref(false);

const activeFiltersCount = computed(() => {
  let count = 0;
  if (filterStatus.value !== "ALL") count++;
  if (filterMissionCategory.value !== "ALL") count++;
  if (sortBy.value !== "LATEST") count++;
  return count;
});

const resetFilters = () => {
  filterStatus.value = "ALL";
  filterMissionCategory.value = "ALL";
  sortBy.value = "LATEST";
  searchQuery.value = "";
};

const filteredList = computed(() => {
  const filtered = list.value.filter((c) => {
    // 종료된 지 일주일(7일)이 지났는지 여부 확인하여 목록에서 완전 제외 (캠페인 자체가 지워지는 것은 아님)
    const isEnded = c.status === "CLOSED" || c.status === "DRAWN" || (c.endsAt && new Date(c.endsAt) < new Date());
    if (isEnded && c.endsAt) {
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      if (new Date(c.endsAt).getTime() < oneWeekAgo) {
        return false;
      }
    }

    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (c.companyName &&
        c.companyName.toLowerCase().includes(searchQuery.value.toLowerCase()));
    
    const type = getStatusType(c);
    let matchesStatus = true;
    if (filterStatus.value !== "ALL") {
      if (filterStatus.value === "ACTIVE") {
        matchesStatus = type === "ACTIVE" || type === "ENDING_SOON";
      } else if (filterStatus.value === "CLOSED") {
        matchesStatus = type === "CLOSED";
      }
    }

    let matchesMission = true;
    if (filterMissionCategory.value !== "ALL") {
      if (!c.missions || c.missions.length === 0) {
        matchesMission = false;
      } else {
        matchesMission = c.missions.some((m) => {
          const mType = m.type || "";
          if (filterMissionCategory.value === "TELEGRAM") return mType.startsWith("TELEGRAM");
          if (filterMissionCategory.value === "DISCORD") return mType.startsWith("DISCORD");
          if (filterMissionCategory.value === "YOUTUBE") return mType.startsWith("YOUTUBE");
          if (filterMissionCategory.value === "INSTAGRAM") return mType.startsWith("INSTAGRAM");
          if (filterMissionCategory.value === "OTHER") {
            return !mType.startsWith("TELEGRAM") &&
                   !mType.startsWith("DISCORD") &&
                   !mType.startsWith("YOUTUBE") &&
                   !mType.startsWith("INSTAGRAM");
          }
          return false;
        });
      }
    }

    return matchesSearch && matchesStatus && matchesMission;
  });

  return [...filtered].sort((a, b) => {
    const typeA = getStatusType(a);
    const typeB = getStatusType(b);

    const score: Record<string, number> = {
      ENDING_SOON: 0,
      ACTIVE: 1,
      UPCOMING: 2,
      CLOSED: 3
    };

    const scoreA = score[typeA] ?? 99;
    const scoreB = score[typeB] ?? 99;
    if (scoreA !== scoreB) return scoreA - scoreB;

    if (sortBy.value === "ENDING_SOON") {
      if (a.endsAt && b.endsAt) {
        return new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime();
      }
      return a.endsAt ? -1 : 1;
    }

    return new Date(b.startsAt || 0).getTime() - new Date(a.startsAt || 0).getTime();
  });
});
</script>

<template>
  <div class="list-container">
    <!-- Header: Match Reference Image -->
    <div class="list-head">
      <div class="head-text">
        <h1 class="page-title">{{ $t("campaign.listTitle") }}</h1>
        <p class="lead-text">{{ $t("campaign.listLead") }}</p>
      </div>

      <div class="filters-bar-modern">
        <div class="search-pill-wrap">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="$t('campaign.searchPlaceholder')"
          />
        </div>
        <button 
          class="btn-filter-modern" 
          :class="{ 'is-active': isFilterPanelOpen, 'has-filters': activeFiltersCount > 0 }"
          @click="isFilterPanelOpen = !isFilterPanelOpen"
        >
          <span class="btn-filter-icon">⚙️</span> 
          {{ $t("campaign.filter") }}
          <span v-if="activeFiltersCount > 0" class="filter-count-badge">{{ activeFiltersCount }}</span>
        </button>
      </div>
    </div>
    <!-- Collapsible Unified Filters Drawer -->
    <transition name="slide-down">
      <div v-if="isFilterPanelOpen" class="filters-drawer-modern">
        <div class="drawer-inner">
          <div class="filter-group">
            <span class="filter-label">{{ $t("campaign.filterLabelStatus") }}</span>
            <div class="filter-options-row">
              <button 
                v-for="status in ['ALL', 'ACTIVE', 'CLOSED']" 
                :key="status"
                class="btn-filter-option"
                :class="{ 'is-selected': filterStatus === status }"
                @click="filterStatus = status"
              >
                {{ 
                  status === 'ALL' ? $t('campaign.filterAll') : 
                  status === 'ACTIVE' ? $t('campaign.statusActive') : $t('campaign.statusClosed') 
                }}
              </button>
            </div>
          </div>

          <div class="filter-group">
            <span class="filter-label">미션 플랫폼 필터</span>
            <div class="filter-options-row">
              <button 
                v-for="cat in ['ALL', 'TELEGRAM', 'DISCORD', 'YOUTUBE', 'INSTAGRAM', 'OTHER']" 
                :key="cat"
                class="btn-filter-option"
                :class="{ 'is-selected': filterMissionCategory === cat }"
                @click="filterMissionCategory = cat"
              >
                {{ 
                  cat === 'ALL' ? '전체' : 
                  cat === 'TELEGRAM' ? '텔레그램' : 
                  cat === 'DISCORD' ? '디스코드' : 
                  cat === 'YOUTUBE' ? '유튜브' : 
                  cat === 'INSTAGRAM' ? '인스타그램' : '기타' 
                }}
              </button>
            </div>
          </div>

          <div class="filter-group">
            <span class="filter-label">{{ $t("campaign.filterLabelSort") }}</span>
            <div class="filter-options-row">
              <button 
                v-for="sort in ['LATEST', 'ENDING_SOON']" 
                :key="sort"
                class="btn-filter-option"
                :class="{ 'is-selected': sortBy === sort }"
                @click="sortBy = sort"
              >
                {{ sort === 'LATEST' ? $t('campaign.sortByLatest') : $t('campaign.sortByEndingSoon') }}
              </button>
            </div>
          </div>

          <div class="drawer-actions">
            <button class="btn-reset-drawer" @click="resetFilters">
              🔄 {{ $t("campaign.filterReset") }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <p v-if="err" class="err">{{ err }}</p>

    <div class="grid">
      <div
        v-for="(c, idx) in filteredList"
        :key="c.id"
        class="campaign-card-premium card"
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
              :src="getCampaignIllustration(c, idx)"
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

    <p v-if="!err && filteredList.length === 0" class="empty-msg">
      등록된 캠페인이 존재하지 않습니다.
    </p>
  </div>
</template>

<style scoped>
.list-container {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1.5rem;
  box-sizing: border-box;
}

.list-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 3.5rem;
  gap: 2rem;
}

.page-title {
  font-size: 2.8rem;
  font-weight: 900;
  color: #1e293b;
  margin: 0 0 0.5rem;
}

.lead-text {
  font-size: 1.2rem;
  color: #64748b;
  margin: 0;
  font-weight: 500;
}

/* Modern Filters Bar: Match Reference Image */
.filters-bar-modern {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.search-pill-wrap {
  position: relative;
  display: flex;
  align-items: center;
  background: #f8fafc;
  border-radius: 99px;
  padding: 0.8rem 1.5rem;
  border: 1px solid #f1f5f9;
  min-width: 320px;
}

.search-icon {
  font-size: 1.1rem;
  color: #94a3b8;
  margin-right: 0.75rem;
}

.search-pill-wrap input {
  border: none;
  background: transparent;
  outline: none;
  width: 100%;
  font-size: 1rem;
  color: #1e293b;
  font-weight: 600;
}

.search-pill-wrap input::placeholder {
  color: #94a3b8;
}

.btn-filter-modern {
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 99px;
  padding: 0.8rem 1.5rem;
  font-size: 1rem;
  font-weight: 700;
  color: #1e293b;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.btn-filter-modern:hover {
  background: #f1f5f9;
}

.btn-filter-modern.has-filters {
  border-color: #6366f1;
  color: #6366f1;
}

.btn-filter-modern.is-active {
  background: #6366f1;
  border-color: #6366f1;
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
}

.btn-filter-icon {
  font-size: 1.1rem;
}

.filter-count-badge {
  background: #ef4444;
  color: white;
  font-size: 0.7rem;
  font-weight: 900;
  min-width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 0.25rem;
  line-height: 1;
}

.btn-filter-modern.is-active .filter-count-badge {
  background: white;
  color: #6366f1;
}

/* Premium Collapsible Filters Drawer */
.filters-drawer-modern {
  background: white;
  border: 1px solid #f1f5f9;
  border-radius: 1.5rem;
  padding: 1.5rem;
  margin-bottom: 2.5rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03);
}

.drawer-inner {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.filter-label {
  font-size: 0.95rem;
  font-weight: 800;
  color: #1e293b;
}

.filter-options-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.btn-filter-option {
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  padding: 0.6rem 1.25rem;
  border-radius: 99px;
  font-size: 0.9rem;
  font-weight: 700;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-filter-option:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.btn-filter-option.is-selected {
  background: #6366f1;
  border-color: #6366f1;
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
}

.drawer-actions {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #f1f5f9;
  padding-top: 1.25rem;
}

.btn-reset-drawer {
  background: transparent;
  border: none;
  font-size: 0.9rem;
  font-weight: 800;
  color: #64748b;
  cursor: pointer;
  transition: color 0.2s;
}

.btn-reset-drawer:hover {
  color: #ef4444;
}

/* Slide Down Transition */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 300px;
  opacity: 1;
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  margin-bottom: 0 !important;
  border-color: transparent !important;
  box-shadow: none !important;
}

/* Redesigned Premium Cards Grid (4 columns default due to 1400px max-width) */
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  width: 100%;
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
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-align: left;
}

/* Card Body Content layout */
.card-body-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
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

.upcoming-date-badge {
  background: #f8fafc;
  padding: 0.35rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 99px;
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Reward row info */
.reward-row-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.reward-row-info .lbl {
  font-size: 0.85rem;
  font-weight: 900;
  color: #1e293b;
}

.val-wrap {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.currency-tag-sm {
  font-size: 0.65rem;
  font-weight: 900;
  width: 14px;
  height: 14px;
  background: #f59e0b;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.currency-tag-sm.brl {
  background: #3b82f6;
}

.reward-row-info .val {
  font-size: 0.95rem;
  font-weight: 900;
  color: #6366f1;
}

/* Footer info */
.card-footer-info {
  margin-top: auto;
  border-top: 1px solid #f8fafc;
  padding-top: 0.75rem;
}

.participants-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.footer-avatars {
  display: flex;
}

.footer-avatars .av {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #cbd5e1;
  border: 2px solid white;
  margin-left: -8px;
}

.footer-avatars .av:first-child {
  margin-left: 0;
}

.footer-avatars .av:nth-child(1) { background: #cbd5e1 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ffffff'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E") no-repeat center; background-size: 1rem; }
.footer-avatars .av:nth-child(2) { background: #94a3b8 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ffffff'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E") no-repeat center; background-size: 1rem; }
.footer-avatars .av:nth-child(3) { background: #64748b url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ffffff'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E") no-repeat center; background-size: 1rem; }

.count-text {
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 700;
}

.upcoming-date-wrap {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.upcoming-date-wrap .lbl {
  font-size: 0.9rem;
  font-weight: 700;
  color: #94a3b8;
}

.upcoming-date-wrap .date-val {
  font-size: 0.95rem;
  font-weight: 900;
  color: #1e293b;
}

/* Card Action Bar Button */
.card-action-bar {
}

.btn-action-primary {
  width: 100%;
  background: #6366f1;
  color: white;
  border: none;
  padding: 0.6rem;
  border-radius: 99px;
  font-weight: 800;
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 8px 16px rgba(99, 102, 241, 0.12);
}

.btn-action-primary:hover {
  background: #4f46e5;
  transform: translateY(-2px);
  box-shadow: 0 12px 20px rgba(99, 102, 241, 0.2);
}

.btn-action-secondary {
  width: 100%;
  background: white;
  color: #64748b;
  border: 1.5px solid #e2e8f0;
  padding: 0.6rem;
  border-radius: 99px;
  font-weight: 800;
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action-secondary:hover {
  background: #f8fafc;
  color: #1e293b;
  border-color: #cbd5e1;
}

.empty-msg {
  color: #64748b;
  text-align: center;
  font-size: 1.2rem;
  font-weight: 700;
  margin-top: 6rem;
  padding-bottom: 6rem;
}

/* Media Queries for Responsiveness */
@media (max-width: 1300px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .list-head {
    flex-direction: column;
    align-items: stretch;
    gap: 1.5rem;
  }
  .filters-bar-modern {
    flex-wrap: wrap;
  }
  .search-pill-wrap {
    min-width: 100%;
  }
}

@media (max-width: 950px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .grid {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }
  .select-modern, .btn-filter-modern {
    flex: 1;
    text-align: center;
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
  .btn-action-primary, .btn-action-secondary {
    padding: 0.5rem;
    font-size: 0.8rem;
  }
}

/* ==========================================
   ✨ PREMIUM DARK MODE STYLES FOR CAMPAIGN LIST
   ========================================== */
:root.dark .page-title {
  color: var(--text-h) !important;
}
:root.dark .lead-text {
  color: var(--muted) !important;
}
:root.dark .search-pill-wrap {
  background: var(--panel) !important;
  border: 1px solid var(--border) !important;
}
:root.dark .search-pill-wrap input {
  color: var(--text-h) !important;
}
:root.dark .btn-filter-modern {
  background: var(--panel) !important;
  border: 1px solid var(--border) !important;
  color: var(--text-h) !important;
}
:root.dark .btn-filter-modern:hover {
  background: var(--code-bg) !important;
}
:root.dark .filters-drawer-modern {
  background: var(--panel) !important;
  border: 1px solid var(--border) !important;
  box-shadow: var(--shadow) !important;
}
:root.dark .filter-label {
  color: var(--text-h) !important;
}
:root.dark .btn-filter-option {
  background: var(--code-bg) !important;
  border: 1px solid var(--border) !important;
  color: var(--text) !important;
}
:root.dark .btn-filter-option:hover {
  background: var(--panel) !important;
  color: var(--text-h) !important;
}
:root.dark .btn-filter-option.is-selected {
  background: #6366f1 !important;
  border-color: #6366f1 !important;
  color: white !important;
}
:root.dark .campaign-card-premium {
  background: var(--panel) !important;
  border: 1.5px solid var(--border) !important;
  box-shadow: var(--shadow) !important;
}
:root.dark .campaign-card-premium:hover {
  box-shadow: var(--shadow-hover) !important;
}
:root.dark .mission-count-badge {
  background: var(--code-bg) !important;
  color: var(--muted) !important;
}
:root.dark .reward-wrap {
  background: rgba(99, 102, 241, 0.15) !important;
  border-color: rgba(99, 102, 241, 0.3) !important;
}
:root.dark .reward-wrap .reward-val {
  color: #818cf8 !important;
}
:root.dark .campaign-card-title {
  color: var(--text-h) !important;
}
:root.dark .card-right-visual {
  background: var(--code-bg) !important;
  border-color: var(--border) !important;
}
:root.dark .upcoming-date-badge {
  background: var(--code-bg) !important;
  border-color: var(--border) !important;
  color: var(--muted) !important;
}
:root.dark .company-name-txt {
  color: var(--muted) !important;
}
:root.dark .mini-logo-fallback {
  background: var(--code-bg) !important;
  border-color: var(--border) !important;
}
:root.dark .mini-logo-img {
  border-color: var(--border) !important;
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
:root.dark .card-inactive .reward-wrap {
  background: rgba(255, 255, 255, 0.03) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
}
:root.dark .card-inactive .reward-wrap .reward-val {
  color: var(--muted) !important;
}
</style>

