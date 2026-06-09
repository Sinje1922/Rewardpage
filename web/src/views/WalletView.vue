<template>
  <div class="wallet-page">
    <div class="wallet-container">

      <!-- 헤더 -->
      <div class="wallet-header">
        <h1 class="wallet-title">
          <span class="wallet-icon">💳</span>
          {{ t('wallet.title') }}
        </h1>
        <p class="wallet-subtitle">{{ t('wallet.subtitle') }}</p>
      </div>

      <!-- 잔액 카드들 -->
      <div class="balance-grid">
        <div class="balance-card" v-for="asset in assets" :key="asset.currency">
          <div class="balance-card-icon">{{ asset.icon }}</div>
          <div class="balance-card-info">
            <div class="balance-currency">{{ asset.label }}</div>
            <div class="balance-amount">
              {{ formatBalance(asset.currency) }}
              <span class="balance-unit">{{ asset.unit }}</span>
            </div>
          </div>
          <div class="balance-card-badge" :class="asset.type">
            {{ asset.type === 'token' ? 'Token' : asset.type === 'cash' ? 'Cash' : 'Point' }}
          </div>
        </div>
      </div>

      <!-- 탭 -->
      <div class="wallet-tabs">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'deposit' }"
          @click="activeTab = 'deposit'"
        >
          <span>⬇️</span> {{ t('wallet.deposit') }}
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'withdraw' }"
          @click="activeTab = 'withdraw'"
        >
          <span>⬆️</span> {{ t('wallet.withdraw') }}
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'history' }"
          @click="activeTab = 'history'"
        >
          <span>📋</span> {{ t('wallet.history') }}
        </button>
      </div>

      <!-- 입금 탭 -->
      <div v-if="activeTab === 'deposit'" class="tab-panel">
        <div class="coming-soon-panel">
          <div class="coming-soon-icon">🚧</div>
          <h2 class="coming-soon-title">{{ t('wallet.depositComingSoon') }}</h2>
          <p class="coming-soon-desc">{{ t('wallet.depositComingSoonDesc') }}</p>

          <!-- 지원 예정 입금 방식 미리보기 -->
          <div class="preview-methods">
            <div class="method-card disabled">
              <div class="method-icon">🏦</div>
              <div class="method-info">
                <div class="method-name">{{ t('wallet.bankTransfer') }}</div>
                <div class="method-desc">BRL</div>
              </div>
              <div class="method-badge soon">{{ t('wallet.comingSoon') }}</div>
            </div>
            <div class="method-card disabled">
              <div class="method-icon">🦊</div>
              <div class="method-info">
                <div class="method-name">MetaMask</div>
                <div class="method-desc">USDT · METAQ</div>
              </div>
              <div class="method-badge soon">{{ t('wallet.comingSoon') }}</div>
            </div>
            <div class="method-card disabled">
              <div class="method-icon">🪙</div>
              <div class="method-info">
                <div class="method-name">PIX</div>
                <div class="method-desc">BRL</div>
              </div>
              <div class="method-badge soon">{{ t('wallet.comingSoon') }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 출금 탭 -->
      <div v-if="activeTab === 'withdraw'" class="tab-panel">
        <div class="coming-soon-panel">
          <div class="coming-soon-icon">🚧</div>
          <h2 class="coming-soon-title">{{ t('wallet.withdrawComingSoon') }}</h2>
          <p class="coming-soon-desc">{{ t('wallet.withdrawComingSoonDesc') }}</p>

          <!-- 출금 방식 미리보기 -->
          <div class="preview-methods">
            <div class="method-card disabled">
              <div class="method-icon">💵</div>
              <div class="method-info">
                <div class="method-name">USDT</div>
                <div class="method-desc">{{ t('wallet.toMetamask') }}</div>
              </div>
              <div class="method-badge soon">{{ t('wallet.comingSoon') }}</div>
            </div>
            <div class="method-card disabled">
              <div class="method-icon">💎</div>
              <div class="method-info">
                <div class="method-name">METAQ</div>
                <div class="method-desc">{{ t('wallet.toMetamask') }}</div>
              </div>
              <div class="method-badge soon">{{ t('wallet.comingSoon') }}</div>
            </div>
            <div class="method-card disabled">
              <div class="method-icon">🇧🇷</div>
              <div class="method-info">
                <div class="method-name">BRL</div>
                <div class="method-desc">PIX · {{ t('wallet.bankTransfer') }}</div>
              </div>
              <div class="method-badge soon">{{ t('wallet.comingSoon') }}</div>
            </div>
            <div class="method-card disabled">
              <div class="method-icon">🪙</div>
              <div class="method-info">
                <div class="method-name">POINT</div>
                <div class="method-desc">{{ t('wallet.convertToBrl') }}</div>
              </div>
              <div class="method-badge soon">{{ t('wallet.comingSoon') }}</div>
            </div>
          </div>

          <!-- 연락 안내 -->
          <div class="contact-notice">
            <p>{{ t('wallet.contactForWithdraw') }}</p>
          </div>
        </div>
      </div>

      <!-- 내역 탭 -->
      <div v-if="activeTab === 'history'" class="tab-panel">
        <div class="history-header">
          <h3>{{ t('wallet.transactionHistory') }}</h3>
        </div>

        <!-- 내역 없음 -->
        <div class="history-empty">
          <div class="empty-icon">📭</div>
          <p>{{ t('wallet.noHistory') }}</p>
          <span class="empty-sub">{{ t('wallet.historyComingSoon') }}</span>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'

const { t } = useI18n()
const auth = useAuthStore()

const activeTab = ref<'deposit' | 'withdraw' | 'history'>('deposit')

const assets = [
  { currency: 'POINT', label: 'POINT', unit: 'P', icon: '🪙', type: 'point' },
  { currency: 'USDT',  label: 'USDT',  unit: 'USDT', icon: '💵', type: 'token' },
  { currency: 'METAQ', label: 'METAQ', unit: 'METAQ', icon: '💎', type: 'token' },
  { currency: 'BRL',   label: 'BRL',   unit: 'BRL', icon: '🇧🇷', type: 'cash' },
  { currency: 'COUPON',label: 'COUPON',unit: '장', icon: '🎟️', type: 'point' },
]

function formatBalance(currency: string): string {
  const user = auth.user as any
  if (!user) return '0'
  switch (currency) {
    case 'POINT':  return (user.pointBalance ?? 0).toLocaleString()
    case 'USDT':   return (user.usdtBalance ?? 0).toFixed(2)
    case 'METAQ':  return (user.metaqBalance ?? 0).toFixed(2)
    case 'BRL':    return (user.brlBalance ?? 0).toFixed(2)
    case 'COUPON': return (user.couponBalance ?? 0).toLocaleString()
    default:       return '0'
  }
}
</script>

<style scoped>
.wallet-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0d1117 100%);
  padding: 2rem 1rem;
  font-family: 'Pretendard', 'Inter', sans-serif;
}

.wallet-container {
  max-width: 800px;
  margin: 0 auto;
}

/* 헤더 */
.wallet-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.wallet-title {
  font-size: 2rem;
  font-weight: 800;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.wallet-icon {
  font-size: 2.2rem;
}

.wallet-subtitle {
  color: #8892b0;
  font-size: 1rem;
}

/* 잔액 카드 그리드 */
.balance-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
  margin-bottom: 2.5rem;
}

.balance-card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 1.25rem 1rem;
  position: relative;
  transition: transform 0.2s, border-color 0.2s;
  backdrop-filter: blur(10px);
}

.balance-card:hover {
  transform: translateY(-2px);
  border-color: rgba(99, 102, 241, 0.4);
}

.balance-card-icon {
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
}

.balance-currency {
  font-size: 0.75rem;
  color: #8892b0;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.balance-amount {
  font-size: 1.4rem;
  font-weight: 800;
  color: #fff;
  margin-top: 0.2rem;
}

.balance-unit {
  font-size: 0.75rem;
  color: #8892b0;
  font-weight: 500;
  margin-left: 0.2rem;
}

.balance-card-badge {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  font-size: 0.6rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.balance-card-badge.token {
  background: rgba(99,102,241,0.2);
  color: #818cf8;
  border: 1px solid rgba(99,102,241,0.3);
}

.balance-card-badge.cash {
  background: rgba(16,185,129,0.2);
  color: #34d399;
  border: 1px solid rgba(16,185,129,0.3);
}

.balance-card-badge.point {
  background: rgba(245,158,11,0.2);
  color: #fbbf24;
  border: 1px solid rgba(245,158,11,0.3);
}

/* 탭 */
.wallet-tabs {
  display: flex;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 0.4rem;
  gap: 0.3rem;
  margin-bottom: 1.5rem;
}

.tab-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  border-radius: 10px;
  color: #8892b0;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.tab-btn:hover {
  color: #e2e8f0;
  background: rgba(255,255,255,0.05);
}

.tab-btn.active {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  box-shadow: 0 4px 15px rgba(99,102,241,0.3);
}

/* 탭 패널 */
.tab-panel {
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Coming Soon 패널 */
.coming-soon-panel {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 20px;
  padding: 3rem 2rem;
  text-align: center;
}

.coming-soon-icon {
  font-size: 3.5rem;
  margin-bottom: 1rem;
}

.coming-soon-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #e2e8f0;
  margin-bottom: 0.75rem;
}

.coming-soon-desc {
  color: #8892b0;
  font-size: 0.95rem;
  margin-bottom: 2rem;
  line-height: 1.6;
}

/* 미리보기 메서드 카드 */
.preview-methods {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}

.method-card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-align: left;
  transition: all 0.2s;
  position: relative;
}

.method-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.method-icon {
  font-size: 1.8rem;
  flex-shrink: 0;
}

.method-info {
  flex: 1;
}

.method-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: #e2e8f0;
}

.method-desc {
  font-size: 0.8rem;
  color: #8892b0;
  margin-top: 0.15rem;
}

.method-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}

.method-badge.soon {
  background: rgba(245,158,11,0.15);
  color: #fbbf24;
  border: 1px solid rgba(245,158,11,0.3);
}

/* 연락 안내 */
.contact-notice {
  margin-top: 2rem;
  padding: 1rem 1.5rem;
  background: rgba(99,102,241,0.08);
  border: 1px solid rgba(99,102,241,0.2);
  border-radius: 12px;
  color: #a5b4fc;
  font-size: 0.9rem;
  line-height: 1.6;
}

/* 내역 탭 */
.history-header {
  margin-bottom: 1.5rem;
}

.history-header h3 {
  font-size: 1.1rem;
  font-weight: 700;
  color: #e2e8f0;
}

.history-empty {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 20px;
  padding: 4rem 2rem;
  text-align: center;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.history-empty p {
  color: #e2e8f0;
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.empty-sub {
  color: #8892b0;
  font-size: 0.85rem;
}

/* 반응형 */
@media (max-width: 600px) {
  .wallet-title {
    font-size: 1.5rem;
  }

  .balance-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .tab-btn {
    font-size: 0.8rem;
    padding: 0.6rem 0.5rem;
  }

  .coming-soon-panel {
    padding: 2rem 1rem;
  }

  .preview-methods {
    grid-template-columns: 1fr;
  }
}
</style>
