<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { api } from '../api/client'

const auth = useAuthStore()

const isLoading = ref<Record<string, boolean>>({})
const successMessage = ref('')
const showSuccessModal = ref(false)
const chargedAmount = ref(0)
const chargedCurrency = ref('')

const currentBalances = computed(() => {
  if (!auth.user) return { POINT: 0, USDT: 0, BRL: 0, METAQ: 0, COUPON: 0 }
  return {
    POINT: auth.user.pointBalance || 0,
    USDT: auth.user.usdtBalance || 0,
    BRL: auth.user.brlBalance || 0,
    METAQ: auth.user.metaqBalance || 0,
    COUPON: auth.user.couponBalance || 0
  }
})

// Shop items config
const shopItems = [
  {
    id: 'point_10k',
    currency: 'POINT',
    name: '10,000 Points',
    amount: 10000,
    price: '₩10,000 (Test Free)',
    icon: '🪙',
    color: '#fbbf24', // Amber
    bg: 'rgba(251, 191, 36, 0.08)',
    border: 'rgba(251, 191, 36, 0.2)'
  },
  {
    id: 'usdt_100',
    currency: 'USDT',
    name: '100 USDT',
    amount: 100,
    price: '$100 (Test Free)',
    icon: '💵',
    color: '#10b981', // Emerald
    bg: 'rgba(16, 185, 129, 0.08)',
    border: 'rgba(16, 185, 129, 0.2)'
  },
  {
    id: 'brl_500',
    currency: 'BRL',
    name: '500 BRL',
    amount: 500,
    price: 'R$500 (Test Free)',
    icon: '🇧🇷',
    color: '#3b82f6', // Blue
    bg: 'rgba(59, 130, 246, 0.08)',
    border: 'rgba(59, 130, 246, 0.2)'
  },
  {
    id: 'metaq_1k',
    currency: 'METAQ',
    name: '1,000 METAQ',
    amount: 1000,
    price: '1,000 MQ (Test Free)',
    icon: '💎',
    color: '#a855f7', // Purple
    bg: 'rgba(168, 85, 247, 0.08)',
    border: 'rgba(168, 85, 247, 0.2)'
  },
  {
    id: 'coupon_50',
    currency: 'COUPON',
    name: '50 Tickets',
    amount: 50,
    price: '50 Tickets (Test Free)',
    icon: '🎟️',
    color: '#ec4899', // Pink
    bg: 'rgba(236, 72, 153, 0.08)',
    border: 'rgba(236, 72, 153, 0.2)'
  }
]

async function recharge(currency: string, amount: number) {
  const key = `${currency}_${amount}`
  if (isLoading.value[key]) return

  isLoading.value[key] = true
  successMessage.value = ''
  
  try {
    await api.post('/me/recharge', { currency, amount })
    await auth.loadMe()
    
    // 비주얼 피드백
    chargedAmount.value = amount
    chargedCurrency.value = currency
    showSuccessModal.value = true
    
    // 오디오 피드백 (브라우저 정책에 따라 사운드 재생 시도)
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      
      osc.type = 'sine'
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime) // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1) // E5
      osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2) // G5
      osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.3) // C6
      
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5)
      
      osc.start()
      osc.stop(audioCtx.currentTime + 0.5)
    } catch (soundErr) {
      // 오디오 방해 없이 무시
    }
  } catch (err: any) {
    alert(err.response?.data?.error || '충전에 실패했습니다. 다시 시도해 주세요.')
  } finally {
    isLoading.value[key] = false
  }
}

const getCurrencyLabel = (cur: string) => {
  if (cur === 'POINT') return 'P'
  if (cur === 'COUPON') return '장'
  return cur
}

onMounted(() => {
  auth.loadMe()
})
</script>

<template>
  <div class="store-view">
    <div class="store-header">
      <div class="subtitle-badge">PROVIDER HUB STORE</div>
      <h1 class="store-title">
        <span class="gradient-text">재화 충전 상점</span>
      </h1>
      <p class="store-desc">
        캠페인 보상 설정에 사용할 재화를 무료로 충전하세요. 임시 테스트 전용 상점입니다.
      </p>
    </div>

    <!-- 보유 재화 현황 대시보드 (Glassmorphism 카드) -->
    <div class="balance-dashboard">
      <div class="dashboard-header">
        <span class="pulse-icon">✨</span>
        <h2>보유 재화 현황</h2>
      </div>
      <div class="balance-cards">
        <!-- POINT Card -->
        <div class="balance-card amber">
          <div class="card-glow" />
          <div class="card-inner">
            <div class="currency-info">
              <span class="currency-icon">🪙</span>
              <span class="currency-name">POINT</span>
            </div>
            <div class="balance-amount">
              {{ currentBalances.POINT.toLocaleString() }} <span class="unit">P</span>
            </div>
          </div>
        </div>
        <!-- USDT Card -->
        <div class="balance-card emerald">
          <div class="card-glow" />
          <div class="card-inner">
            <div class="currency-info">
              <span class="currency-icon">💵</span>
              <span class="currency-name">USDT</span>
            </div>
            <div class="balance-amount">
              {{ currentBalances.USDT.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }) }} <span class="unit">USDT</span>
            </div>
          </div>
        </div>
        <!-- BRL Card -->
        <div class="balance-card blue">
          <div class="card-glow" />
          <div class="card-inner">
            <div class="currency-info">
              <span class="currency-icon">🇧🇷</span>
              <span class="currency-name">BRL</span>
            </div>
            <div class="balance-amount">
              {{ currentBalances.BRL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }) }} <span class="unit">BRL</span>
            </div>
          </div>
        </div>
        <!-- METAQ Card -->
        <div class="balance-card purple">
          <div class="card-glow" />
          <div class="card-inner">
            <div class="currency-info">
              <span class="currency-icon">💎</span>
              <span class="currency-name">METAQ</span>
            </div>
            <div class="balance-amount">
              {{ currentBalances.METAQ.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }) }} <span class="unit">MQ</span>
            </div>
          </div>
        </div>
        <!-- COUPON Card -->
        <div class="balance-card pink">
          <div class="card-glow" />
          <div class="card-inner">
            <div class="currency-info">
              <span class="currency-icon">🎟️</span>
              <span class="currency-name">티켓</span>
            </div>
            <div class="balance-amount">
              {{ currentBalances.COUPON.toLocaleString() }} <span class="unit">장</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 상품 카드 리스트 -->
    <div class="shop-section">
      <h3 class="section-title">테스트 무료 충전 목록</h3>
      <div class="shop-grid">
        <div 
          v-for="item in shopItems" 
          :key="item.id" 
          class="shop-card"
          :style="{ '--brand-color': item.color, '--brand-bg': item.bg, '--brand-border': item.border }"
        >
          <div class="item-icon-wrapper">
            <span class="item-icon">{{ item.icon }}</span>
          </div>
          <h4 class="item-name">{{ item.name }}</h4>
          <p class="item-price">{{ item.price }}</p>
          <button 
            @click="recharge(item.currency, item.amount)" 
            :disabled="isLoading[`${item.currency}_${item.amount}`]"
            class="btn-recharge"
          >
            <span v-if="isLoading[`${item.currency}_${item.amount}`]" class="spinner" />
            <span v-else>충전하기</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 충전 완료 모달 팝업 -->
    <transition name="fade-scale">
      <div v-if="showSuccessModal" class="modal-overlay" @click="showSuccessModal = false">
        <div class="modal-content" @click.stop>
          <div class="celebration-emojis">🎉 💰 ✨</div>
          <h2>충전 완료!</h2>
          <p class="modal-message">
            성공적으로 <strong>{{ chargedAmount.toLocaleString() }}{{ getCurrencyLabel(chargedCurrency) }}</strong>가 내 계정에 추가되었습니다.
          </p>
          <button class="btn-modal-close" @click="showSuccessModal = false">확인</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.store-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem 6rem;
  box-sizing: border-box;
}

.store-header {
  text-align: center;
  margin-bottom: 4rem;
}

.subtitle-badge {
  display: inline-block;
  padding: 0.4rem 1rem;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  margin-bottom: 1rem;
}

.store-title {
  font-size: 3rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  margin: 0 0 1rem;
}

.gradient-text {
  background: linear-gradient(135deg, #4f46e5 0%, #a855f7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

:root.dark .gradient-text {
  background: linear-gradient(135deg, #818cf8 0%, #c084fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.store-desc {
  font-size: 1.1rem;
  color: #64748b;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

:root.dark .store-desc {
  color: #94a3b8;
}

/* Dashboard Style (Glassmorphism) */
.balance-dashboard {
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.03);
  border-radius: 2rem;
  padding: 2rem;
  margin-bottom: 4rem;
  transition: all 0.3s ease;
}

:root.dark .balance-dashboard {
  background: rgba(30, 41, 59, 0.45);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.dashboard-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.dashboard-header h2 {
  font-size: 1.25rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
}

:root.dark .dashboard-header h2 {
  color: #f8fafc;
}

.pulse-icon {
  animation: pulse 2s infinite alternate;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(1.15); opacity: 1; }
}

.balance-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1.25rem;
}

@media (max-width: 1024px) {
  .balance-cards {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .balance-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .balance-cards {
    grid-template-columns: 1fr;
  }
}

.balance-card {
  position: relative;
  border-radius: 1.5rem;
  padding: 1.5rem;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

:root.dark .balance-card {
  border-color: rgba(255, 255, 255, 0.04);
}

.balance-card.amber { background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(251, 191, 36, 0.05) 100%); color: #b45309; }
.balance-card.emerald { background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%); color: #047857; }
.balance-card.blue { background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%); color: #1d4ed8; }
.balance-card.purple { background: linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 247, 0.05) 100%); color: #6d28d9; }
.balance-card.pink { background: linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(236, 72, 153, 0.05) 100%); color: #db2777; }

:root.dark .balance-card.amber { background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(0, 0, 0, 0.3) 100%); color: #fbbf24; }
:root.dark .balance-card.emerald { background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(0, 0, 0, 0.3) 100%); color: #34d399; }
:root.dark .balance-card.blue { background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(0, 0, 0, 0.3) 100%); color: #60a5fa; }
:root.dark .balance-card.purple { background: linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(0, 0, 0, 0.3) 100%); color: #c084fc; }
:root.dark .balance-card.pink { background: linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(0, 0, 0, 0.3) 100%); color: #f472b6; }

.card-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, transparent 60%);
  opacity: 0.3;
  pointer-events: none;
  mix-blend-mode: overlay;
}

.currency-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.currency-icon {
  font-size: 1.5rem;
}

.currency-name {
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  opacity: 0.8;
}

.balance-amount {
  font-size: 1.75rem;
  font-weight: 900;
  letter-spacing: -0.03em;
}

.balance-amount .unit {
  font-size: 0.95rem;
  font-weight: 700;
  margin-left: 2px;
  opacity: 0.7;
}

/* Shop List Section */
.shop-section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 850;
  color: #1e293b;
  margin-bottom: 2rem;
}

:root.dark .section-title {
  color: #f8fafc;
}

.shop-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1.5rem;
}

@media (max-width: 1200px) {
  .shop-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .shop-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .shop-grid {
    grid-template-columns: 1fr;
  }
}

.shop-card {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 1.75rem;
  padding: 2rem;
  text-align: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
}

:root.dark .shop-card {
  background: rgba(30, 41, 59, 0.65);
  border-color: rgba(255, 255, 255, 0.06);
}

.shop-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.06);
  border-color: var(--brand-border);
  background: var(--brand-bg);
}

.item-icon-wrapper {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.03);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(0,0,0,0.02);
  transition: all 0.3s ease;
}

:root.dark .item-icon-wrapper {
  background: rgba(15, 23, 42, 0.8);
  border-color: rgba(255,255,255,0.03);
}

.shop-card:hover .item-icon-wrapper {
  transform: scale(1.1);
  background: white;
}

:root.dark .shop-card:hover .item-icon-wrapper {
  background: rgba(15, 23, 42, 0.9);
}

.item-icon {
  font-size: 2.25rem;
}

.item-name {
  font-size: 1.25rem;
  font-weight: 850;
  color: #1e293b;
  margin: 0 0 0.5rem;
}

:root.dark .item-name {
  color: #f8fafc;
}

.item-price {
  font-size: 0.95rem;
  color: #64748b;
  font-weight: 600;
  margin: 0 0 2rem;
}

:root.dark .item-price {
  color: #94a3b8;
}

.btn-recharge {
  width: 100%;
  padding: 0.9rem 1.5rem;
  border-radius: 1rem;
  background: #1e293b;
  color: white;
  border: none;
  font-weight: 800;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

:root.dark .btn-recharge {
  background: #f8fafc;
  color: #0f172a;
}

.shop-card:hover .btn-recharge {
  background: var(--brand-color);
  color: white;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
}

.btn-recharge:active {
  transform: scale(0.97);
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Modal Styling */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.15);
  border-radius: 2rem;
  padding: 3rem 2.5rem;
  width: 90%;
  max-width: 440px;
  text-align: center;
  animation: modal-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

:root.dark .modal-content {
  background: rgba(30, 41, 59, 0.9);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.35);
}

@keyframes modal-pop {
  0% { transform: scale(0.9) translateY(20px); opacity: 0; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}

.celebration-emojis {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.modal-content h2 {
  font-size: 1.75rem;
  font-weight: 900;
  color: #1e293b;
  margin: 0 0 1rem;
}

:root.dark .modal-content h2 {
  color: #f8fafc;
}

.modal-message {
  font-size: 1.05rem;
  color: #64748b;
  line-height: 1.6;
  margin: 0 0 2rem;
}

:root.dark .modal-message {
  color: #94a3b8;
}

.btn-modal-close {
  background: #6366f1;
  color: white;
  border: none;
  padding: 0.9rem 2.5rem;
  border-radius: 1.25rem;
  font-weight: 800;
  font-size: 1rem;
  cursor: pointer;
  box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
  transition: all 0.2s ease;
}

.btn-modal-close:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(99, 102, 241, 0.45);
}

/* Transitions */
.fade-scale-enter-active, .fade-scale-leave-active {
  transition: all 0.3s ease;
}

.fade-scale-enter-from, .fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
