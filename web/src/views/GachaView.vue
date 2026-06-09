<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { api } from '../api/client'
import { useI18n } from 'vue-i18n'

const auth = useAuthStore()
const router = useRouter()
const { locale } = useI18n()

// Gacha State
const isDrawing = ref(false)
const drawingText = ref('')
const showDispensed = ref(false)
const showResultModal = ref(false)
const showProbabilityModal = ref(false)
const lastResults = ref<any[]>([])
const history = ref<any[]>([])

// Local Translations Dictionary
const translations: Record<string, Record<string, string>> = {
  ko: {
    tag: '💡 행운의 기회',
    title: '럭키 드로우',
    desc: '뽑기 쿠폰을 소비하여 포인트, USDT, METAQ 등 행운의 보상에 도전해보세요!',
    balanceLabel: '보유한 뽑기 쿠폰',
    balanceUnit: '장',
    goShop: '상점 바로가기 🏪',
    draw1: '1회 뽑기',
    draw10: '10회 뽑기',
    drawAgain: '다시 뽑기',
    close: '확인',
    cost1: '쿠폰 1장 소모',
    cost10: '쿠폰 10장 소모',
    historyTitle: '최근 뽑기 내역',
    noHistory: '아직 이번 세션에 뽑은 내역이 없습니다.',
    insufficient: '쿠폰이 부족합니다. 상점에서 획득해보세요!',
    congrats: '축하합니다! 아래 보상을 획득하셨습니다.',
    status1: '기프트 상자를 흔들고 있습니다...',
    status2: '행운의 당첨 구슬이 굴러나옵니다!',
    noneReward: '아쉽게도 다음 기회에!',
    pointUnit: '포인트',
    probTitle: '뽑기 보상 확률 안내',
    probSubtitle: '각 보상 항목 및 당첨 확률 정보입니다.',
    probRewardName: '보상 항목',
    probRewardType: '종류',
    probWeight: '당첨 확률',
    probNote: '* 모든 보상은 개별 독립적인 확률로 추첨됩니다.',
    probBtn: '확률표 보기'
  },
  en: {
    tag: '💡 LUCKY OPPORTUNITY',
    title: 'Lucky Draw',
    desc: 'Spend your draw coupons to win amazing prizes like Points, USDT, and METAQ!',
    balanceLabel: 'Your Draw Coupons',
    balanceUnit: 'Coupons',
    goShop: 'Go to Shop 🏪',
    draw1: 'Draw 1',
    draw10: 'Draw 10',
    drawAgain: 'Draw Again',
    close: 'Confirm',
    cost1: 'Consumes 1 Coupon',
    cost10: 'Consumes 10 Coupons',
    historyTitle: 'Recent Draw History',
    noHistory: 'No draw history in this session yet.',
    insufficient: 'Insufficient coupons. Purchase more at the Shop!',
    congrats: 'Congratulations! You won the following rewards:',
    status1: 'Shaking the lucky box...',
    status2: 'Drawn capsule is rolling out!',
    noneReward: 'Better luck next time!',
    pointUnit: 'Points',
    probTitle: 'Lucky Draw Probability Guide',
    probSubtitle: 'Detailed probability guide for rewards.',
    probRewardName: 'Reward Item',
    probRewardType: 'Type',
    probWeight: 'Probability',
    probNote: '* All draws are conducted with independent probabilities.',
    probBtn: 'Probabilities'
  },
  pt: {
    tag: '💡 CHANCE DE SORTE',
    title: 'Sorteio da Sorte',
    desc: 'Gaste cupons para ganhar recompensas incríveis como Pontos, USDT e METAQ!',
    balanceLabel: 'Seus Cupons de Gacha',
    balanceUnit: 'Cupons',
    goShop: 'Ir para Loja 🏪',
    draw1: 'Sortear 1',
    draw10: 'Sortear 10',
    drawAgain: 'Sortear Novamente',
    close: 'Confirmar',
    cost1: 'Consome 1 Cupom',
    cost10: 'Consome 10 Cupons',
    historyTitle: 'Histórico de Sorteio',
    noHistory: 'Nenhum sorteio realizado nesta sessão ainda.',
    insufficient: 'Cupons insuficientes. Adquira mais na Loja!',
    congrats: 'Parabéns! Você ganhou as seguintes recompensas:',
    status1: 'Sacudindo a caixa da sorte...',
    status2: 'A cápsula da sorte está rolando!',
    noneReward: 'Mais sorte na próxima vez!',
    pointUnit: 'Pontos',
    probTitle: 'Guia de Probabilidade do Sorteio',
    probSubtitle: 'Detalhes de probabilidades de recompensa.',
    probRewardName: 'Recompensa',
    probRewardType: 'Tipo',
    probWeight: 'Probabilidade',
    probNote: '* Todos os sorteios têm probabilidades independentes.',
    probBtn: 'Probabilidades'
  }
}

// Translate Helper
const t = (key: string) => {
  const currentLang = locale.value || 'ko'
  const langPack = translations[currentLang] || translations['ko']
  return langPack[key] || key
}

// User Balance Getter
const couponBalance = computed(() => {
  return auth.user?.couponBalance ?? 0
})

// Initialize/Load
onMounted(async () => {
  if (auth.token && !auth.user) {
    try {
      await auth.loadMe()
    } catch (e) {
      console.error(e)
    }
  }
})

// Handle Gacha Draw
const handleDraw = async (count: number) => {
  if (isDrawing.value) return

  if (couponBalance.value < count) {
    alert(t('insufficient'))
    return
  }

  isDrawing.value = true
  showDispensed.value = false
  showResultModal.value = false

  // Step-by-step animation narrative
  drawingText.value = t('status1')

  try {
    // API Call
    const { data } = await api.post('/me/gacha', { count })

    // Simulate crank & shake duration
    setTimeout(() => {
      drawingText.value = t('status2')
      showDispensed.value = true

      setTimeout(() => {
        // Update user state with returned data
        if (auth.user && data.user) {
          auth.user.couponBalance = data.user.couponBalance
          auth.user.pointBalance = data.user.pointBalance
          auth.user.usdtBalance = data.user.usdtBalance
          auth.user.brlBalance = data.user.brlBalance
          auth.user.metaqBalance = data.user.metaqBalance
        }

        // Setup results & display modal
        lastResults.value = data.results.map((res: any) => ({
          ...res,
          // Translate none rewards
          name: res.type === 'NONE' ? t('noneReward') : res.name
        }))
        showResultModal.value = true
        isDrawing.value = false
        showDispensed.value = false

        // Record history
        recordHistory(count, lastResults.value)
      }, 1000)
    }, 1200)

  } catch (error: any) {
    isDrawing.value = false
    console.error('Failed drawing:', error)
    const errorMsg = error.response?.data?.error || 'Gacha failed'
    alert(errorMsg)
  }
}

// Save history locally for the session
const recordHistory = (count: number, results: any[]) => {
  const now = new Date()
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  
  // Aggregate summary
  const summary: Record<string, { name: string; amount: number; count: number; icon: string; type: string }> = {}
  
  results.forEach(r => {
    const key = `${r.type}_${r.amount}`
    if (!summary[key]) {
      summary[key] = {
        name: r.name,
        amount: r.amount,
        count: 1,
        icon: r.icon,
        type: r.type
      }
    } else {
      summary[key].count++
    }
  })

  const summaryList = Object.values(summary).map(s => {
    if (s.count > 1) {
      return { ...s, name: `${s.name} x${s.count}` }
    }
    return s
  })

  history.value.unshift({
    time: timeStr,
    count,
    summary: summaryList
  })
}

const closeModal = () => {
  showResultModal.value = false
}
</script>

<template>
  <div class="gacha-container">
    <!-- Header -->
    <div class="gacha-header centered">
      <span class="section-tag">{{ t('tag') }}</span>
      <h1 class="page-title">{{ t('title') }}</h1>
      <p class="section-desc">{{ t('desc') }}</p>
      <button class="btn btn-prob" @click="showProbabilityModal = true">
        📊 {{ t('probBtn') }}
      </button>
    </div>

    <div class="gacha-grid-layout">
      <!-- Main Card -->
      <div class="machine-card card">
        <!-- Coupon Display Panel -->
        <div class="balance-bar">
          <div class="balance-info">
            <span class="ticket-icon">🎟️</span>
            <div class="balance-text-group">
              <span class="balance-label">{{ t('balanceLabel') }}</span>
              <span class="balance-val">
                <strong>{{ couponBalance.toLocaleString() }}</strong> <span class="unit">{{ t('balanceUnit') }}</span>
              </span>
            </div>
          </div>
          <button class="btn go-shop-btn" @click="router.push('/store')">
            {{ t('goShop') }}
          </button>
        </div>

        <!-- Animated Capsule Gacha Machine -->
        <div class="gacha-machine-wrapper" :class="{ 'is-shaking': isDrawing }">
          <div class="gacha-machine">
            <!-- Glass Dome -->
            <div class="glass-dome">
              <div class="glass-shine"></div>
              <div class="light-beam" :class="{ 'is-active': isDrawing }"></div>
              <div class="capsules-container">
                <div v-for="i in 14" :key="i" class="capsule-ball" :class="[`cap-${i}`, { 'is-bouncing': isDrawing }]"></div>
              </div>
            </div>

            <!-- Crank Base -->
            <div class="machine-base">
              <div class="base-plate"></div>
              <div class="crank-area">
                <div class="crank-handle" :class="{ 'is-spinning': isDrawing }">
                  <div class="handle-center"></div>
                  <div class="handle-bar handle-bar-1"></div>
                  <div class="handle-bar handle-bar-2"></div>
                </div>
              </div>
              <div class="exit-port">
                <div class="exit-flap">PUSH</div>
                <!-- Dispensed Capsule Capsule Ball -->
                <div class="dispensed-ball" :class="{ 'is-dispensing': showDispensed }"></div>
              </div>
            </div>
          </div>

          <!-- Loading overlay state -->
          <transition name="fade">
            <div v-if="isDrawing" class="drawing-status">
              <div class="drawing-spinner"></div>
              <p class="status-msg">{{ drawingText }}</p>
            </div>
          </transition>
        </div>

        <!-- Draw Button Actions -->
        <div class="action-buttons-row">
          <button 
            class="btn primary draw-btn animate-pulse-btn" 
            :disabled="isDrawing || couponBalance < 1"
            @click="handleDraw(1)"
          >
            <span class="btn-primary-text">{{ t('draw1') }}</span>
            <span class="btn-sub-text">{{ t('cost1') }}</span>
          </button>
          
          <button 
            class="btn primary draw-btn multi-draw animate-pulse-btn" 
            :disabled="isDrawing || couponBalance < 10"
            @click="handleDraw(10)"
          >
            <span class="btn-primary-text">{{ t('draw10') }}</span>
            <span class="btn-sub-text">{{ t('cost10') }}</span>
          </button>
        </div>
      </div>

      <!-- History Card -->
      <div class="history-card card">
        <h3 class="history-title">⏳ {{ t('historyTitle') }}</h3>
        <div class="history-list-wrapper">
          <div v-if="history.length === 0" class="empty-history">
            <span class="empty-icon">📭</span>
            <p>{{ t('noHistory') }}</p>
          </div>
          <div v-else class="history-list">
            <transition-group name="history-item-anim">
              <div v-for="(item, idx) in history" :key="idx" class="history-item">
                <div class="item-meta">
                  <span class="item-time">{{ item.time }}</span>
                  <span class="badge" :class="{ 'badge-gold': item.count === 10 }">
                    {{ item.count === 10 ? '10 Draws' : '1 Draw' }}
                  </span>
                </div>
                <div class="item-summary-content">
                  <div v-for="(prize, pIdx) in item.summary" :key="pIdx" class="prize-tag" :class="prize.type.toLowerCase()">
                    <span class="prize-icon">{{ prize.icon }}</span>
                    <span class="prize-name">{{ prize.name }}</span>
                  </div>
                </div>
              </div>
            </transition-group>
          </div>
        </div>
      </div>
    </div>

    <!-- Result Modal Overlay -->
    <transition name="modal-fade">
      <div v-if="showResultModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content-card card">
          <!-- Sparkles particles background -->
          <div class="confetti-particles">
            <div v-for="i in 20" :key="i" class="confetti-dot" :style="{ 
              left: Math.random() * 100 + '%',
              animationDelay: Math.random() * 1.5 + 's',
              backgroundColor: ['#ffbe0b','#fb5607','#ff006e','#8338ec','#3a86c8'][Math.floor(Math.random()*5)]
            }"></div>
          </div>

          <div class="modal-header">
            <span class="win-badge">🎁 DRAW RESULTS</span>
            <h2>{{ t('congrats') }}</h2>
          </div>

          <!-- Prizes grid display -->
          <div class="rewards-scroller">
            <div class="rewards-grid" :class="{ 'is-multi': lastResults.length > 1 }">
              <div 
                v-for="(reward, idx) in lastResults" 
                :key="idx" 
                class="reward-box reveal-scale-in"
                :class="[reward.type.toLowerCase(), { 'is-empty-prize': reward.type === 'NONE' }]"
                :style="{ animationDelay: (idx * 0.12) + 's' }"
              >
                <div class="light-effect"></div>
                <div class="reward-icon-container">
                  <span class="reward-emoji">{{ reward.icon }}</span>
                </div>
                <div class="reward-detail">
                  <span class="reward-title">{{ reward.name }}</span>
                  <span class="reward-type-label">{{ reward.type }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal action buttons -->
          <div class="modal-actions-row">
            <button 
              class="btn primary redraw-action-btn"
              :disabled="couponBalance < lastResults.length"
              @click="handleDraw(lastResults.length)"
            >
              🔄 {{ t('drawAgain') }}
            </button>
            <button class="btn confirm-action-btn" @click="closeModal">
              {{ t('close') }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Probability Guide Modal -->
    <transition name="modal-fade">
      <div v-if="showProbabilityModal" class="modal-overlay" @click.self="showProbabilityModal = false">
        <div class="modal-content-card card probability-modal">
          <div class="modal-header">
            <span class="win-badge">📊 PROBABILITY</span>
            <h2>{{ t('probTitle') }}</h2>
            <p class="subtitle-text">{{ t('probSubtitle') }}</p>
          </div>

          <div class="modal-body-content">
            <div class="table-container">
              <table class="prob-table">
                <thead>
                  <tr>
                    <th>{{ t('probRewardName') }}</th>
                    <th>{{ t('probRewardType') }}</th>
                    <th>{{ t('probWeight') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="prob-row">
                    <td><span class="emoji">🪙</span> 500 {{ t('pointUnit') }}</td>
                    <td><span class="badge badge-point">POINT</span></td>
                    <td class="rate">5.0%</td>
                  </tr>
                  <tr class="prob-row">
                    <td><span class="emoji">🪙</span> 100 {{ t('pointUnit') }}</td>
                    <td><span class="badge badge-point">POINT</span></td>
                    <td class="rate">25.0%</td>
                  </tr>
                  <tr class="prob-row">
                    <td><span class="emoji">🪙</span> 50 {{ t('pointUnit') }}</td>
                    <td><span class="badge badge-point">POINT</span></td>
                    <td class="rate">35.0%</td>
                  </tr>
                  <tr class="prob-row">
                    <td><span class="emoji">💵</span> 0.5 USDT</td>
                    <td><span class="badge badge-usdt">USDT</span></td>
                    <td class="rate">3.0%</td>
                  </tr>
                  <tr class="prob-row">
                    <td><span class="emoji">💵</span> 0.1 USDT</td>
                    <td><span class="badge badge-usdt">USDT</span></td>
                    <td class="rate">15.0%</td>
                  </tr>
                  <tr class="prob-row">
                    <td><span class="emoji">💎</span> 5 METAQ</td>
                    <td><span class="badge badge-metaq">METAQ</span></td>
                    <td class="rate">2.0%</td>
                  </tr>
                  <tr class="prob-row">
                    <td><span class="emoji">💎</span> 1 METAQ</td>
                    <td><span class="badge badge-metaq">METAQ</span></td>
                    <td class="rate">10.0%</td>
                  </tr>
                  <tr class="prob-row italic-none">
                    <td><span class="emoji">💨</span> {{ t('noneReward') }}</td>
                    <td><span class="badge badge-none">NONE</span></td>
                    <td class="rate">5.0%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="prob-note">{{ t('probNote') }}</p>
          </div>

          <div class="modal-actions-row">
            <button class="btn confirm-action-btn" @click="showProbabilityModal = false">
              {{ t('close') }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.gacha-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.gacha-header {
  margin-bottom: 0.5rem;
}

.gacha-grid-layout {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 2rem;
  align-items: start;
}

@media (max-width: 960px) {
  .gacha-grid-layout {
    grid-template-columns: 1fr;
  }
}

/* ─── Machine Card ─────────────────────────────────────── */
.machine-card {
  padding: 2rem;
  background: var(--panel);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.balance-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(108, 92, 231, 0.05);
  border: 1px solid rgba(108, 92, 231, 0.15);
  padding: 1rem 1.5rem;
  border-radius: var(--radius-sm);
}

:root.dark .balance-bar {
  background: rgba(129, 140, 248, 0.08);
  border-color: rgba(129, 140, 248, 0.2);
}

.balance-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.ticket-icon {
  font-size: 2.2rem;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
}

.balance-text-group {
  display: flex;
  flex-direction: column;
}

.balance-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--muted);
}

.balance-val {
  font-size: 1.4rem;
  color: var(--text-h);
}
.balance-val strong {
  font-size: 1.8rem;
  font-weight: 900;
  color: var(--accent);
}
.balance-val .unit {
  font-size: 0.95rem;
  color: var(--muted);
  margin-left: 2px;
}

.go-shop-btn {
  font-size: 0.85rem;
  padding: 0.5rem 1rem;
  min-height: auto;
  border-radius: var(--radius-sm);
  background: var(--bg);
  border-color: var(--border);
}
.go-shop-btn:hover {
  background: var(--bg-deep);
  border-color: var(--accent-border);
}

/* ─── Gacha Machine Graphical Visual ────────────────────── */
.gacha-machine-wrapper {
  position: relative;
  width: 100%;
  max-width: 380px;
  margin: 0 auto;
  aspect-ratio: 1 / 1.25;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gacha-machine {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Glass Dome containing balls */
.glass-dome {
  flex: 1.3;
  background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(0, 0, 0, 0.1) 100%);
  border: 4px solid var(--border);
  border-bottom: none;
  border-top-left-radius: 50% 60%;
  border-top-right-radius: 50% 60%;
  border-bottom-left-radius: 5%;
  border-bottom-right-radius: 5%;
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 20px 40px rgba(255,255,255,0.2), inset 0 -20px 40px rgba(0,0,0,0.15);
}

.glass-shine {
  position: absolute;
  top: 8%;
  left: 10%;
  width: 25%;
  height: 25%;
  background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 80%);
  border-radius: 50%;
  transform: rotate(-15deg);
  pointer-events: none;
}

.light-beam {
  position: absolute;
  bottom: 0;
  left: 10%;
  right: 10%;
  top: 30%;
  background: radial-gradient(ellipse at bottom, rgba(108, 92, 231, 0.15) 0%, transparent 75%);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s;
}
.light-beam.is-active {
  opacity: 1;
  animation: flare 1s ease-in-out infinite alternate;
}

@keyframes flare {
  0% { transform: scaleX(0.9); opacity: 0.6; }
  100% { transform: scaleX(1.2); opacity: 1; }
}

.capsules-container {
  position: absolute;
  left: 8%;
  right: 8%;
  bottom: 5px;
  height: 65%;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-end;
  justify-content: center;
  gap: 6px;
  padding: 10px;
}

/* Colored Capsule Balls */
.capsule-ball {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  box-shadow: inset -6px -6px 12px rgba(0,0,0,0.25), 0 3px 6px rgba(0,0,0,0.15);
  position: relative;
  flex-shrink: 0;
}
.capsule-ball::after {
  content: '';
  position: absolute;
  top: 4px;
  left: 4px;
  width: 14px;
  height: 14px;
  background: rgba(255,255,255,0.4);
  border-radius: 50%;
}

/* Color palettes for capsule balls */
.cap-1 { background: radial-gradient(circle at 35% 35%, #ffbe0b, #e5a900); }
.cap-2 { background: radial-gradient(circle at 35% 35%, #ff006e, #d6005c); }
.cap-3 { background: radial-gradient(circle at 35% 35%, #8338ec, #6a22d4); }
.cap-4 { background: radial-gradient(circle at 35% 35%, #3a86c8, #266aa7); }
.cap-5 { background: radial-gradient(circle at 35% 35%, #00f5d4, #00cca8); }
.cap-6 { background: radial-gradient(circle at 35% 35%, #fb5607, #d54100); }
.cap-7 { background: radial-gradient(circle at 35% 35%, #a29bfe, #7a6df1); }
.cap-8 { background: radial-gradient(circle at 35% 35%, #ffbe0b, #e5a900); }
.cap-9 { background: radial-gradient(circle at 35% 35%, #ff006e, #d6005c); }
.cap-10 { background: radial-gradient(circle at 35% 35%, #8338ec, #6a22d4); }
.cap-11 { background: radial-gradient(circle at 35% 35%, #3a86c8, #266aa7); }
.cap-12 { background: radial-gradient(circle at 35% 35%, #00f5d4, #00cca8); }
.cap-13 { background: radial-gradient(circle at 35% 35%, #fb5607, #d54100); }
.cap-14 { background: radial-gradient(circle at 35% 35%, #a29bfe, #7a6df1); }

/* Bouncing Animations */
.capsule-ball.is-bouncing {
  animation: bounceBall 0.8s infinite alternate;
}
.capsule-ball.is-bouncing.cap-1 { animation-delay: 0.1s; animation-duration: 0.65s; }
.capsule-ball.is-bouncing.cap-2 { animation-delay: 0.3s; animation-duration: 0.72s; }
.capsule-ball.is-bouncing.cap-3 { animation-delay: 0.05s; animation-duration: 0.58s; }
.capsule-ball.is-bouncing.cap-4 { animation-delay: 0.22s; animation-duration: 0.61s; }
.capsule-ball.is-bouncing.cap-5 { animation-delay: 0.15s; animation-duration: 0.69s; }
.capsule-ball.is-bouncing.cap-6 { animation-delay: 0.28s; animation-duration: 0.54s; }
.capsule-ball.is-bouncing.cap-7 { animation-delay: 0.08s; animation-duration: 0.7s; }
.capsule-ball.is-bouncing.cap-8 { animation-delay: 0.18s; animation-duration: 0.62s; }
.capsule-ball.is-bouncing.cap-9 { animation-delay: 0.32s; animation-duration: 0.56s; }
.capsule-ball.is-bouncing.cap-10 { animation-delay: 0.11s; animation-duration: 0.68s; }
.capsule-ball.is-bouncing.cap-11 { animation-delay: 0.25s; animation-duration: 0.6s; }
.capsule-ball.is-bouncing.cap-12 { animation-delay: 0.02s; animation-duration: 0.74s; }
.capsule-ball.is-bouncing.cap-13 { animation-delay: 0.35s; animation-duration: 0.5s; }
.capsule-ball.is-bouncing.cap-14 { animation-delay: 0.17s; animation-duration: 0.66s; }

@keyframes bounceBall {
  0% { transform: translateY(0) scale(1) rotate(0deg); }
  50% { transform: translateY(-50px) scaleX(0.9) rotate(90deg); }
  75% { transform: translateY(-20px) translateX(10px) rotate(180deg); }
  100% { transform: translateY(-80px) translateX(-15px) scale(0.95) rotate(270deg); }
}

/* Shaking Gacha Wrapper */
.gacha-machine-wrapper.is-shaking {
  animation: shakeMachine 0.15s infinite;
}

@keyframes shakeMachine {
  0% { transform: translate(1px, 1px) rotate(0deg); }
  10% { transform: translate(-1px, -2px) rotate(-1deg); }
  20% { transform: translate(-3px, 0px) rotate(1deg); }
  30% { transform: translate(0px, 2px) rotate(0deg); }
  40% { transform: translate(1px, -1px) rotate(1deg); }
  50% { transform: translate(-1px, 2px) rotate(-1deg); }
  60% { transform: translate(-3px, 1px) rotate(0deg); }
  70% { transform: translate(2px, 1px) rotate(-1deg); }
  80% { transform: translate(-1px, -1px) rotate(1deg); }
  90% { transform: translate(2px, 2px) rotate(0deg); }
  100% { transform: translate(1px, -2px) rotate(-1deg); }
}

/* Machine Base Container */
.machine-base {
  flex: 1;
  background: linear-gradient(135deg, var(--accent), #4f46e5);
  border: 4px solid var(--border);
  border-radius: 12px;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  box-shadow: 0 10px 20px rgba(0,0,0,0.15);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
}

.base-plate {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 8px;
  background: rgba(0,0,0,0.2);
}

.crank-area {
  margin-top: 10px;
  width: 90px;
  height: 90px;
  background: rgba(255,255,255,0.1);
  border: 3px solid rgba(255,255,255,0.25);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 4px 10px rgba(0,0,0,0.3);
}

.crank-handle {
  width: 55px;
  height: 55px;
  background: white;
  border-radius: 50%;
  position: relative;
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.crank-handle.is-spinning {
  animation: spinCrank 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes spinCrank {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.handle-center {
  width: 18px;
  height: 18px;
  background: var(--accent);
  border-radius: 50%;
  z-index: 5;
}

.handle-bar {
  position: absolute;
  background: #cbd5e1;
  border-radius: 4px;
}

.handle-bar-1 {
  width: 80%;
  height: 10px;
  top: 50%;
  left: 10%;
  transform: translateY(-50%);
}

.handle-bar-2 {
  width: 10px;
  height: 80%;
  left: 50%;
  top: 10%;
  transform: translateX(-50%);
}

.exit-port {
  width: 100px;
  height: 50px;
  background: rgba(0,0,0,0.4);
  border: 3px solid rgba(255,255,255,0.2);
  border-radius: 8px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: inset 0 5px 10px rgba(0,0,0,0.6);
}

.exit-flap {
  font-size: 0.75rem;
  font-weight: 900;
  color: rgba(255,255,255,0.6);
  pointer-events: none;
}

.dispensed-ball {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  position: absolute;
  top: 40px;
  background: radial-gradient(circle at 35% 35%, #fb5607, #d54100);
  box-shadow: inset -4px -4px 8px rgba(0,0,0,0.3), 0 3px 6px rgba(0,0,0,0.4);
  opacity: 0;
  pointer-events: none;
  z-index: 10;
}
.dispensed-ball.is-dispensing {
  animation: dispenseBall 1s cubic-bezier(0.25, 1, 0.5, 1) forwards;
}

@keyframes dispenseBall {
  0% { top: -45px; opacity: 0; transform: scale(0.6) rotate(0deg); }
  40% { top: 3px; opacity: 1; transform: scale(1) rotate(120deg); }
  70% { top: 3px; opacity: 1; transform: translateY(-3px) rotate(180deg); }
  100% { top: 3px; opacity: 1; transform: translateY(0) scale(1) rotate(220deg); }
}

/* Loading Overlay inside machine container */
.drawing-status {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  border-radius: var(--radius);
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.drawing-spinner {
  width: 45px;
  height: 45px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.status-msg {
  color: white;
  font-weight: 800;
  font-size: 1.05rem;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  animation: pulseText 1s infinite alternate;
}

@keyframes pulseText {
  0% { opacity: 0.8; }
  100% { opacity: 1; }
}

/* ─── Action Buttons ─────────────────────────────────────── */
.action-buttons-row {
  display: flex;
  gap: 1.25rem;
}

@media (max-width: 480px) {
  .action-buttons-row {
    flex-direction: column;
    gap: 0.75rem;
  }
}

.draw-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  padding: 1.1rem 1.5rem;
  border-radius: var(--radius);
}

.draw-btn.multi-draw {
  background: linear-gradient(135deg, #fb5607, #ff006e);
}
.draw-btn.multi-draw:hover:not(:disabled) {
  background: linear-gradient(135deg, #ff7135, #ff2a89);
  box-shadow: 0 8px 25px rgba(251, 86, 7, 0.3);
  transform: translateY(-2px);
}

.btn-primary-text {
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.btn-sub-text {
  font-size: 0.75rem;
  font-weight: 500;
  opacity: 0.85;
}

.animate-pulse-btn:hover:not(:disabled) {
  animation: buttonPulse 1.5s infinite;
}

@keyframes buttonPulse {
  0% { box-shadow: 0 0 0 0 rgba(108, 92, 231, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(108, 92, 231, 0); }
  100% { box-shadow: 0 0 0 0 rgba(108, 92, 231, 0); }
}

.draw-btn.multi-draw:hover:not(:disabled) {
  animation: buttonPulseMulti 1.5s infinite;
}

@keyframes buttonPulseMulti {
  0% { box-shadow: 0 0 0 0 rgba(251, 86, 7, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(251, 86, 7, 0); }
  100% { box-shadow: 0 0 0 0 rgba(251, 86, 7, 0); }
}

/* ─── History Card ─────────────────────────────────────── */
.history-card {
  padding: 1.5rem 2rem;
  height: 100%;
  max-height: 650px;
  display: flex;
  flex-direction: column;
}

.history-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-h);
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
}

.history-list-wrapper {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}

.empty-history {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: var(--muted);
  height: 250px;
}

.empty-icon {
  font-size: 2.5rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.history-item {
  background: var(--bg-deep);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.item-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.item-time {
  font-size: 0.75rem;
  color: var(--muted);
  font-weight: 600;
}

.badge-gold {
  background: rgba(251, 191, 36, 0.12) !important;
  color: #d97706 !important;
  border-color: rgba(251, 191, 36, 0.25) !important;
}

.item-summary-content {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.prize-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.25rem 0.6rem;
  border-radius: 0.4rem;
  border: 1px solid var(--border);
  background: var(--panel);
}

.prize-tag.point { color: #b45309; border-color: rgba(251, 191, 36, 0.3); background: #fffbeb; }
.prize-tag.usdt { color: #15803d; border-color: rgba(34, 197, 94, 0.3); background: #f0fdf4; }
.prize-tag.metaq { color: #4338ca; border-color: rgba(99, 102, 241, 0.3); background: #eef2ff; }
.prize-tag.none { color: var(--muted); background: var(--bg-deep); }

:root.dark .prize-tag.point { color: #fbbf24; background: rgba(251, 191, 36, 0.08); }
:root.dark .prize-tag.usdt { color: #4ade80; background: rgba(34, 197, 94, 0.08); }
:root.dark .prize-tag.metaq { color: #a5b4fc; background: rgba(99, 102, 241, 0.08); }

/* History animation transition */
.history-item-anim-enter-active {
  transition: all 0.4s ease;
}
.history-item-anim-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

/* ─── Result Modal Overlay ─────────────────────────────── */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(12px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.modal-content-card {
  width: 100%;
  max-width: 620px;
  background: var(--panel);
  border: 1.5px solid var(--accent-border);
  box-shadow: 0 25px 50px rgba(0,0,0,0.3);
  padding: 2.5rem;
  position: relative;
  overflow: hidden;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

@media (max-width: 480px) {
  .modal-content-card {
    padding: 1.5rem;
  }
}

.modal-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.win-badge {
  display: inline-block;
  background: var(--accent);
  color: white;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.35rem 1rem;
  border-radius: 99px;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
  box-shadow: 0 4px 10px rgba(108, 92, 231, 0.3);
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 900;
  color: var(--text-h);
}

.rewards-scroller {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  margin-bottom: 1.5rem;
}

.rewards-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  justify-items: center;
}

.rewards-grid.is-multi {
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

@media (max-width: 480px) {
  .rewards-grid.is-multi {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
}

.reward-box {
  width: 100%;
  max-width: 260px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.85rem 1.2rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}

.reward-box.reveal-scale-in {
  opacity: 0;
  animation: revealScale 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes revealScale {
  0% { opacity: 0; transform: scale(0.7) translateY(10px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

/* Specific glows for reward boxes */
.reward-box.point { border-color: rgba(251, 191, 36, 0.4); box-shadow: 0 4px 15px rgba(251, 191, 36, 0.08); }
.reward-box.usdt { border-color: rgba(34, 197, 94, 0.4); box-shadow: 0 4px 15px rgba(34, 197, 94, 0.08); }
.reward-box.metaq { border-color: rgba(99, 102, 241, 0.4); box-shadow: 0 4px 15px rgba(99, 102, 241, 0.08); }
.reward-box.is-empty-prize { opacity: 0.75; background: rgba(0,0,0,0.02); }

.light-effect {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 60%);
  pointer-events: none;
}

.reward-icon-container {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--bg-deep);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  flex-shrink: 0;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

.reward-detail {
  display: flex;
  flex-direction: column;
}

.reward-title {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--text-h);
}

.reward-type-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--muted);
  letter-spacing: 0.05em;
}

/* Confetti particles animation */
.confetti-particles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
}

.confetti-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  top: -10px;
  animation: fallConfetti 3s linear infinite;
}

@keyframes fallConfetti {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(500px) rotate(360deg); opacity: 0; }
}

/* Modal Actions */
.modal-actions-row {
  display: flex;
  gap: 1rem;
}

.redraw-action-btn {
  flex: 1;
}

.confirm-action-btn {
  flex: 1;
  background: var(--bg);
  border-color: var(--border);
}
.confirm-action-btn:hover {
  background: var(--bg-deep);
}

/* Modal Animations */
.modal-fade-enter-active {
  transition: opacity 0.3s ease;
}
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from, .modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-content-card {
  animation: slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes slideIn {
  from { transform: translateY(30px) scale(0.95); }
  to { transform: translateY(0) scale(1); }
}

.btn-prob {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  padding: 0.4rem 1rem;
  min-height: auto;
  border-radius: var(--radius-sm);
  background: var(--panel);
  border-color: var(--border);
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  transition: all 0.2s ease;
}
.btn-prob:hover {
  background: var(--bg-deep);
  border-color: var(--accent);
  transform: translateY(-1px);
}

.probability-modal {
  max-width: 500px !important;
}

.subtitle-text {
  font-size: 0.85rem;
  color: var(--muted);
  margin-top: 0.25rem;
}

.modal-body-content {
  margin: 1rem 0 1.5rem;
  text-align: left;
}

.table-container {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--bg-deep);
}

.prob-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.9rem;
}

.prob-table th, .prob-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
}

.prob-table th {
  background: rgba(108, 92, 231, 0.08);
  font-weight: 800;
  color: var(--text-h);
}

:root.dark .prob-table th {
  background: rgba(129, 140, 248, 0.12);
}

.prob-table tr:last-child td {
  border-bottom: none;
}

.prob-row {
  transition: background 0.15s ease;
}
.prob-row:hover {
  background: rgba(255, 255, 255, 0.4);
}
:root.dark .prob-row:hover {
  background: rgba(255, 255, 255, 0.03);
}

.prob-row td {
  font-weight: 600;
}

.prob-row td.rate {
  font-weight: 800;
  color: var(--accent);
  text-align: right;
}

.emoji {
  margin-right: 4px;
}

.badge-point { background: rgba(251, 191, 36, 0.12); color: #d97706; border: 1px solid rgba(251, 191, 36, 0.25); }
.badge-usdt { background: rgba(34, 197, 94, 0.12); color: #16a34a; border: 1px solid rgba(34, 197, 94, 0.25); }
.badge-metaq { background: rgba(99, 102, 241, 0.12); color: #4f46e5; border: 1px solid rgba(99, 102, 241, 0.25); }
.badge-none { background: rgba(0, 0, 0, 0.05); color: var(--muted); border: 1px solid var(--border); }

:root.dark .badge-point { background: rgba(251, 191, 36, 0.08); color: #fbbf24; }
:root.dark .badge-usdt { background: rgba(34, 197, 94, 0.08); color: #4ade80; }
:root.dark .badge-metaq { background: rgba(99, 102, 241, 0.08); color: #a5b4fc; }

.prob-note {
  font-size: 0.75rem;
  color: var(--muted);
  margin-top: 0.75rem;
  font-weight: 600;
}
</style>
