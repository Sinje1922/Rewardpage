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

const router = useRouter();
const { t } = useI18n();
const list = ref<Campaign[]>([]);
const err = ref("");
const searchQuery = ref("");
const filterStatus = ref("ALL");
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
// Helper to strip HTML tags for clean preview text
const stripHtml = (html: string) => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "");
};

// Helper to calculate reward per person
const getRewardPerPerson = (c: Campaign) => {
  if (c.rewardsConfig && c.rewardsConfig !== "[]") {
    try {
      const parsed = JSON.parse(c.rewardsConfig);
      if (parsed.length > 0) {
        const r = parsed[0];
        const perPerson = Math.floor(r.amount / (c.winnerCount || 1));
        return {
          val: `+${perPerson.toLocaleString()}${r.currency === "POINT" ? "P" : " " + r.currency}`,
          curr: r.currency === "POINT" ? "P" : r.currency
        };
      }
    } catch (e) {
      console.error(e);
    }
  }
  const perPerson = Math.floor((c.totalRewardPoints || 0) / (c.winnerCount || 1));
  return {
    val: `+${perPerson.toLocaleString()}${c.rewardCurrency === "POINT" ? "P" : " " + c.rewardCurrency}`,
    curr: c.rewardCurrency === "POINT" ? "P" : c.rewardCurrency
  };
};

const getCampaignDefaultImage = (c: Campaign, idx: number) => {
  const type = getStatusType(c);
  if (type === "UPCOMING") return cpAsset5;
  if (type === "CLOSED") return cpAsset4;
  
  const assets = [cpAsset1, cpAsset2, cpAsset3];
  return assets[idx % assets.length];
};

const isFilterPanelOpen = ref(false);

const activeFiltersCount = computed(() => {
  let count = 0;
  if (filterStatus.value !== "ALL") count++;
  if (sortBy.value !== "LATEST") count++;
  return count;
});

const resetFilters = () => {
  filterStatus.value = "ALL";
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
    return matchesSearch && matchesStatus;
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

    <!-- Grid of Redesigned Premium Cards -->
    <div class="grid">
      <div
        v-for="(c, idx) in filteredList"
        :key="c.id"
        class="campaign-card-premium card"
        :class="{ 'card-inactive': getStatusType(c) === 'CLOSED' }"
      >
        <!-- Top Row Badges -->
        <div class="card-top-badges">
          <div class="left-badges">
            <span
              class="status-badge"
              :class="getStatusType(c).toLowerCase()"
            >
              {{
                getStatusType(c) === "ACTIVE"
                  ? "진행중"
                  : getStatusType(c) === "ENDING_SOON"
                    ? "마감임박"
                    : getStatusType(c) === "UPCOMING"
                      ? "예정"
                      : "종료"
              }}
            </span>
            <span class="mission-count-badge">
              미션 {{ c.missions?.length ?? 1 }}
            </span>
          </div>
          <div class="right-reward-capsule">
            <span class="coin-icon">🪙</span>
            <span class="reward-val">{{ getRewardPerPerson(c).val }}</span>
          </div>
        </div>

        <!-- Centered 3D / Brand Visual -->
        <div class="card-visual-center">
          <img
            :src="c.companyLogoUrl ? getFileUrl(c.companyLogoUrl) : getCampaignDefaultImage(c, idx)"
            class="visual-3d-img"
            :class="{ 'company-logo-custom': c.companyLogoUrl }"
            alt="Campaign Illustration"
          />
        </div>

        <!-- Body & Details -->
        <div class="card-body-details">
          <h2 class="campaign-card-title">{{ c.title }}</h2>
          <p class="campaign-card-desc">{{ stripHtml(c.description) }}</p>


          <div class="card-footer-info">
            <!-- Normal / Closed Footer -->
            <div v-if="getStatusType(c) !== 'UPCOMING'" class="participants-wrap">
              <div class="footer-avatars">
                <div class="av"></div>
                <div class="av"></div>
                <div class="av"></div>
              </div>
              <span class="count-text">
                {{ (c.winnerCount || 12345).toLocaleString() }}명 참여{{ getStatusType(c) === 'CLOSED' ? '' : '중' }}
              </span>
            </div>
            
            <!-- Upcoming Footer -->
            <div v-else class="upcoming-date-wrap">
              <span class="lbl">오픈 예정일</span>
              <span class="date-val">
                {{ c.startsAt ? new Date(c.startsAt).toLocaleDateString() : '2024. 06. 01' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Stretched Full Width Action Button -->
        <div class="card-action-bar">
          <button
            v-if="getStatusType(c) !== 'CLOSED' && getStatusType(c) !== 'UPCOMING'"
            class="btn-action-primary"
            @click="router.push(`/campaigns/${c.id}`)"
          >
            참여하기
          </button>
          <button
            v-else
            class="btn-action-secondary"
            @click="router.push(`/campaigns/${c.id}`)"
          >
            상세보기
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
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  width: 100%;
}

.campaign-card-premium {
  background: white;
  border-radius: 1.25rem;
  border: 1px solid #f1f5f9;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.02);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 240px;
}

.campaign-card-premium:hover {
  transform: translateY(-8px);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.05);
}

.card-inactive {
  opacity: 0.8;
}

/* Card Top Badges */
.card-top-badges {
  padding: 1rem 1rem 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.left-badges {
  display: flex;
  gap: 0.5rem;
}

.status-badge {
  font-size: 0.7rem;
  font-weight: 800;
  padding: 0.2rem 0.45rem;
  border-radius: 6px;
}

.status-badge.active {
  background: #ecfdf5;
  color: #059669;
}

.status-badge.ending_soon {
  background: #fef2f2;
  color: #dc2626;
}

.status-badge.upcoming {
  background: #f5f3ff;
  color: #7c3aed;
}

.status-badge.closed {
  background: #f1f5f9;
  color: #64748b;
}

.mission-count-badge {
  font-size: 0.7rem;
  font-weight: 800;
  background: #f1f5f9;
  color: #64748b;
  padding: 0.2rem 0.45rem;
  border-radius: 6px;
}

/* Right Currency Reward Capsule */
.right-reward-capsule {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  background: #f1f5f9;
  padding: 0.2rem 0.65rem;
  border-radius: 99px;
  font-weight: 800;
  font-size: 0.8rem;
}

.coin-icon {
  font-size: 0.95rem;
}

.right-reward-capsule .reward-val {
  color: #6366f1;
  font-weight: 800;
}

/* Centered Visual Image */
.card-visual-center {
  height: 135px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem;
}

.visual-3d-img {
  height: 100%;
  width: auto;
  max-width: 100%;
  object-fit: contain;
  filter: drop-shadow(0 10px 20px rgba(0,0,0,0.04));
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.company-logo-custom {
  height: 100%;
  width: auto;
  max-width: 100%;
  border-radius: 1.25rem;
  border: 1px solid #e2e8f0;
  object-fit: contain;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
}

.campaign-card-premium:hover .visual-3d-img {
  transform: scale(1.08) translateY(-4px);
}

/* Card Body Details */
.card-body-details {
  padding: 0.75rem 1rem 1rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.company-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.company-mini-logo {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  object-fit: cover;
  border: 1px solid #f1f5f9;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.02);
}

.company-name {
  font-size: 0.85rem;
  font-weight: 800;
  color: #64748b;
}

.campaign-card-title {
  font-size: 1.05rem;
  font-weight: 900;
  color: #1e293b;
  margin: 0 0 0.3rem;
  line-height: 1.3;
}

.campaign-card-desc {
  font-size: 0.8rem;
  color: #64748b;
  margin: 0 0 0.85rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 32px;
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
  padding: 0 1rem 1rem;
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
  }
  .card-visual-center {
    height: 140px;
    padding: 0.75rem;
  }
  .campaign-card-title {
    font-size: 1.15rem;
    line-height: 1.4;
  }
  .campaign-card-desc {
    font-size: 0.85rem;
    line-height: 1.5;
  }
  .btn-action-primary, .btn-action-secondary {
    padding: 0.65rem;
    font-size: 0.85rem;
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
  border: 1px solid var(--border) !important;
  box-shadow: var(--shadow) !important;
}
:root.dark .campaign-card-premium:hover {
  box-shadow: var(--shadow-hover) !important;
}
:root.dark .mission-count-badge {
  background: var(--code-bg) !important;
  color: var(--muted) !important;
}
:root.dark .right-reward-capsule {
  background: var(--code-bg) !important;
}
:root.dark .campaign-card-title {
  color: var(--text-h) !important;
}
:root.dark .campaign-card-desc {
  color: var(--muted) !important;
}
:root.dark .company-name {
  color: var(--muted) !important;
}
:root.dark .card-footer-info {
  border-top: 1px solid var(--border) !important;
}
:root.dark .count-text {
  color: var(--muted) !important;
}
:root.dark .upcoming-date-wrap .lbl {
  color: var(--muted) !important;
}
:root.dark .upcoming-date-wrap .date-val {
  color: var(--text-h) !important;
}
:root.dark .empty-msg {
  color: var(--muted) !important;
}
</style>

