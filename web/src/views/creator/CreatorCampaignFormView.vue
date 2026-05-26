<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api, getFileUrl } from '../../api/client'
import { uploadCompanyLogo } from '../../api/upload'
import MissionListEditor from '../../components/ops/MissionListEditor.vue'
import RichEditor from '../../components/common/RichEditor.vue'
import { emptyMissionRow, rowToPayload, validateRows, type MissionRowState } from '../../utils/missionRow'

const { t, locale } = useI18n()
const router = useRouter()
const currentStep = ref(1)

const companyName = ref('')
const companyLogoUrl = ref('')
const title = ref('')
const description = ref('')
const winnerCount = ref(1)
const lotteryMode = ref<'SIMPLE' | 'WEIGHTED'>('SIMPLE')
const autoApprove = ref(true)
const rewards = ref<{ amount: number; currency: string; customCurrency?: string }[]>([{ amount: 0, currency: 'POINT' }])
const startsAt = ref('')
const endsAt = ref('')
const missionRows = ref<MissionRowState[]>([emptyMissionRow(0)])
const err = ref('')

const logoUploading = ref(false)
const logoFileInput = ref<HTMLInputElement | null>(null)

const rewardImageUrl = ref('')
const rewardImageUploading = ref(false)
const rewardImageFileInput = ref<HTMLInputElement | null>(null)

const stepGuides = computed(() => {
  const current = locale.value || 'ko'
  const dict: Record<string, any> = {
    ko: {
      step1Title: '기본 정보 입력 (1단계)',
      step1Lead: '캠페인의 첫인상을 결정합니다. 매력적인 배너 이미지와 구체적인 미션 배경을 적어 유저의 높은 참여율을 유도해보세요!',
      step1Tips: [
        '회사 로고 이미지는 정사각형(1:1 비율) 투명 PNG 형식을 가장 권장합니다.',
        '캠페인 상세 설명에 퀴즈 정답 힌트나 미션 참여 유의 사항(예: "구독 즉시 취소 시 당첨 무효")을 미리 고지해 주시면 좋습니다.',
        '시각적으로 눈길을 끄는 멋진 타이틀과 설명은 유저의 자연스러운 미션 공유를 촉진합니다.'
      ],
      step2Title: '보상 및 추첨 방식 설정 (2단계)',
      step2Lead: '보상 규모와 합리적인 추첨 방식을 설정하여 유저들의 신뢰도를 얻으세요.',
      step2Tips: [
        '<strong>단순 무작위 추첨 (Simple Draw)</strong>: 모든 미션 완료자가 동일한 확률로 당첨됩니다. 가볍고 빠른 참여 유도형 이벤트에 적합합니다.',
        '<strong>기여도 비례 가중치 추첨 (Weighted Draw)</strong>: 더 많은 미션을 성실히 완수한 유저에게 더 높은 가중치(당첨 확률 티켓)를 자동으로 지급하여 체리피커를 배제합니다. (Pickku 강력 추천! 👑)',
        '<strong>자동 검증 승인 (Auto Approve)</strong>: 사용자가 소셜 미션을 정확하게 마쳤는지 소셜 API 연동을 통해 실시간으로 자동 대조 및 승인 처리를 수행합니다.',
        '<strong>멀티 보상 레이아웃</strong>: 포인트, USDT, BRL, METAQ 등의 재화 보상은 1번째 줄에 배지 형태로 노출되며(여러 개 등록 시 마우스 오버로 부드럽게 무한 루프 슬라이딩), 그 외 기프티콘 등의 일반 경품은 2번째 줄(기타 보상)에 깔끔하게 자동 구분되어 표기됩니다.'
      ],
      step3Title: '미션 구성 및 세부 설계 (3단계)',
      step3Lead: '다양한 소셜 액션과 퀴즈, 설문을 미션으로 추가하여 브랜드 커뮤니티를 효과적으로 빌딩하세요.',
      step3Tips: [
        '<strong>유튜브 구독/좋아요</strong>: 유튜브 채널의 ID 또는 동영상 고유 ID를 정확히 넣어주셔야 참여자의 구글 로그인 검증이 원활하게 연동됩니다.',
        '<strong>텔레그램 채널/그룹</strong>: 픽쿠 텔레그램 공식 검증 봇이 채널 내 실시간 참가 상태를 확인하므로, 올바른 공개 채널 링크(t.me)를 기입해 주세요.',
        '<strong>디스코드 서버 입장</strong>: 디스코드 서버 관리 메뉴에서 만료 기간이 없는 "무제한 초대 링크"를 생성하여 입력하셔야 링크 끊김 없이 안전하게 참가됩니다.',
        '<strong>정답 퀴즈/설문 조사</strong>: 유저가 직접 학습할 수 있어 고농축 브랜드 인지도 전환을 만들어냅니다. 오답 시 <code>"다시 생각해 보세요"</code> 경고창이 나타나며, 승인이 완료된 미션(<code>APPROVED</code>)은 중복 방지를 위해 제출 버튼이 자동으로 비활성화됩니다.'
      ],
      step4Title: '실시간 미리보기 및 최종 확인 (4단계)',
      step4Lead: '캠페인을 발행하기 전에 유저들에게 노출될 실제 카드 및 상세 페이지 화면을 꼼꼼하게 검토해 보세요.',
      step4Tips: [
        '<strong>목록 카드 프리뷰</strong>: 홈 화면이나 검색 결과 등 다양한 목록 영역에서 표시되는 압도적인 Premium 카드 비주얼입니다.',
        '<strong>상세 화면 프리뷰</strong>: 유저가 미션을 본격적으로 수행하고 보상 규모와 안내 가이드를 확인할 수 있는 메인 랜딩 페이지입니다.',
        '오타가 없고 미션 구성이 올바른지 다시 한번 확인하고 아래 [캠페인·미션 저장] 버튼을 누르면 실시간으로 배포됩니다.'
      ],
      guideBoxTitle: '💡 캠페인 작성 꿀팁 & 주의사항'
    },
    en: {
      step1Title: 'Basic Campaign Setup (Step 1)',
      step1Lead: 'Set the first impression of your campaign. Upload premium banners and describe your goals clearly to maximize participation!',
      step1Tips: [
        'A square (1:1 ratio) transparent PNG format is highly recommended for the company logo.',
        'Use the description field to state important rules or hints (e.g. "Unsubscribing immediately invalidates eligibility").',
        'Stunning titles and description layouts encourage users to naturally share your missions.'
      ],
      step2Title: 'Logistics & Draw Mode (Step 2)',
      step2Lead: 'Establish trust by setting a clear reward structure and picking the perfect draw engine.',
      step2Tips: [
        '<strong>Simple Draw</strong>: Every user who completes all core missions has an equal chance of winning. Perfect for quick and light events.',
        '<strong>Weighted Draw (Recommended 👑)</strong>: Users who complete more optional missions earn higher winning probabilities, filtering out bots and low-quality accounts.',
        '<strong>Auto Approve</strong>: Social network APIs dynamically verify if the user truly completed each action and automatically approve valid entries.',
        '<strong>Multi-Reward Layout</strong>: Major financial rewards (POINT, USDT, BRL, METAQ) are displayed on the 1st row as sleek badges (hovering loops them with a smooth marquee slide when multiple are set), while physical prizes/coupons auto-align on the 2nd row (Other Rewards).'
      ],
      step3Title: 'Configure Missions (Step 3)',
      step3Lead: 'Add social followings, video view times, quizzes, or surveys to grow and enrich your brand community.',
      step3Tips: [
        '<strong>YouTube Missions</strong>: Enter the exact YouTube Channel ID or Video ID to guarantee the API verifies subscribes or likes seamlessly.',
        '<strong>Telegram Channels</strong>: Pickku Telegram bot verifies join status. Provide direct public links (t.me).',
        '<strong>Discord Invites</strong>: Generate a non-expiring ("never expire") invitation link from Discord server settings to prevent access dropouts.',
        '<strong>Quizzes & Surveys</strong>: Prompts users to learn about your product. Wrong quiz entries trigger a <code>"Please think again (다시 생각해 보세요)"</code> alert, and successfully approved missions (<code>APPROVED</code>) dynamically disable their submit buttons.'
      ],
      step4Title: 'Live Preview & Review (Step 4)',
      step4Lead: 'Review how your campaign card and detail page will visually appear to actual users in real-time before publishing.',
      step4Tips: [
        '<strong>List Card Preview</strong>: The exact card layout users see when browsing campaigns on the home and search directories.',
        '<strong>Detail Page Preview</strong>: The full engagement page displaying mission instructions, per-winner reward breakdowns, and tasks.',
        'Double-check all descriptions and rewards. When everything is perfect, click [Save] to publish your campaign!'
      ],
      guideBoxTitle: '💡 Campaign Creation Tips & Guides'
    },
    pt: {
      step1Title: 'Configurações Básicas (Passo 1)',
      step1Lead: 'Crie a primeira impressão da sua campanha. Faça o upload de banners premium e descreva seus objetivos claramente para maximizar a participação!',
      step1Tips: [
        'Um formato PNG transparente quadrado (proporção 1:1) é altamente recomendado para o logotipo da empresa.',
        'Use the campo de descrição para declarar regras importantes (ex: "Cancelar a inscrição imediatamente invalida a elegibilidade").',
        'Títulos impressionantes incentivam os usuários a compartilhar naturalmente suas missões.'
      ],
      step2Title: 'Logística & Modo de Sorteio (Passo 2)',
      step2Lead: 'Estabeleça confiança definindo uma estrutura de recompensa clara e escolhendo o mecanismo de sorteio perfeito.',
      step2Tips: [
        '<strong>Sorteio Simples (Simple Draw)</strong>: Todos os usuários que completarem todas as missões têm a mesma chance de ganhar. Perfeito para eventos rápidos.',
        '<strong>Sorteio Ponderado (Weighted Draw - Recomendado 👑)</strong>: Usuários que realizam mais tarefas ganham maiores probabilidades de ganhar, filtrando bots.',
        '<strong>Aprovação Automática (Auto Approve)</strong>: As APIs de mídia social verificam dinamicamente se as tarefas foram realmente concluídas.',
        '<strong>Layout de Multi-Recompensas</strong>: As principais recompensas financeiras (POINT, USDT, BRL, METAQ) são exibidas na 1ª linha como emblemas elegantes (com slide dinâmico ao passar o mouse se houver múltiplas), enquanto prêmios físicos aparecem na 2ª linha.'
      ],
      step3Title: 'Configuração de Missões (Passo 3)',
      step3Lead: 'Adicione seguidores sociais, visualizações de vídeo, quizzes ou pesquisas para enriquecer sua comunidade.',
      step3Tips: [
        '<strong>Missões do YouTube</strong>: Insira o ID exato do Canal ou Vídeo para garantir que a verificação de inscrição ocorra sem problemas.',
        '<strong>Canais do Telegram</strong>: O bot do Telegram do Pickku verifica a entrada. Forneça links públicos diretos (t.me).',
        '<strong>Convites do Discord</strong>: Crie um link de convite que "nunca expira" nas configurações do seu servidor para evitar quedas de acesso.',
        '<strong>Quizzes e Pesquisas</strong>: Incentive os usuários a aprender sobre o produto. Respostas incorretas de quiz disparam um alerta <code>"다시 생각해 보세요" (Pense novamente)</code> e missões concluídas com sucesso (<code>APPROVED</code>) desativam o botão de envio.'
      ],
      step4Title: 'Prévia em Tempo Real & Revisão (Passo 4)',
      step4Lead: 'Revise como o cartão da sua campanha e a página de detalhes aparecerão visualmente para os usuários reais em tempo real.',
      step4Tips: [
        '<strong>Prévia do Cartão</strong>: O layout exato do cartão que os usuários veem ao navegar pelas campanhas na tela inicial.',
        '<strong>Prévia da Página de Detalhes</strong>: A página completa que exibe as instruções da missão, recompensas por vencedor e tarefas.',
        'Verifique todas as descrições e recompensas. Quando tudo estiver perfeito, clique em [Salvar] para publicar sua campanha!'
      ],
      guideBoxTitle: '💡 Dicas e Guias de Criação de Campanha'
    }
  }
  return dict[current] || dict.ko
})

async function onLogoFile(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  err.value = ''
  logoUploading.value = true
  try {
    companyLogoUrl.value = await uploadCompanyLogo(file)
  } catch {
    err.value = t('ops.logoUploadFail')
  } finally {
    logoUploading.value = false
    input.value = ''
  }
}

function clearLogo() {
  companyLogoUrl.value = ''
}

async function onRewardImageFile(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  err.value = ''
  rewardImageUploading.value = true
  try {
    rewardImageUrl.value = await uploadCompanyLogo(file)
  } catch {
    err.value = '보상 이미지 업로드에 실패했습니다.'
  } finally {
    rewardImageUploading.value = false
    input.value = ''
  }
}

function clearRewardImage() {
  rewardImageUrl.value = ''
}

function addReward() {
  rewards.value.push({ amount: 0, currency: 'POINT' })
}

function removeReward(index: number) {
  if (rewards.value.length > 1) {
    rewards.value.splice(index, 1)
  }
}

const isStep1Valid = computed(() => !!title.value.trim())
const isStep2Valid = computed(() => winnerCount.value > 0 && rewards.value.some(r => r.amount > 0))
const isStep3Valid = computed(() => missionRows.value.length > 0)
const isStep4Valid = computed(() => true)

function getMissionTypeName(type: string) {
  const current = locale.value || 'ko'
  const names: Record<string, Record<string, string>> = {
    ko: {
      CHECKIN: '단순 방문 확인',
      YOUTUBE_SUB: '유튜브 채널 구독',
      YOUTUBE_LIKE: '유튜브 비디오 시청 및 좋아요',
      TELEGRAM_JOIN: '텔레그램 채널/그룹 입장',
      DISCORD_JOIN: '디스코드 서버 입장',
      INSTAGRAM_FOLLOW: '인스타그램 팔로우',
      QUIZ: '퀴즈 풀기',
      SURVEY: '설문조사 응답',
      FILE: '이미지/파일 업로드 인증'
    },
    en: {
      CHECKIN: 'Simple Check-in',
      YOUTUBE_SUB: 'Subscribe YouTube Channel',
      YOUTUBE_LIKE: 'Watch YouTube Video & Like',
      TELEGRAM_JOIN: 'Join Telegram Channel/Group',
      DISCORD_JOIN: 'Join Discord Server',
      INSTAGRAM_FOLLOW: 'Follow Instagram',
      QUIZ: 'Solve Quiz',
      SURVEY: 'Complete Survey',
      FILE: 'Upload Verification File'
    },
    pt: {
      CHECKIN: 'Check-in Simples',
      YOUTUBE_SUB: 'Inscrever-se no Canal do YouTube',
      YOUTUBE_LIKE: 'Assistir Vídeo no YouTube & Curtir',
      TELEGRAM_JOIN: 'Entrar no Canal/Grupo do Telegram',
      DISCORD_JOIN: 'Entrar no Servidor do Discord',
      INSTAGRAM_FOLLOW: 'Seguir no Instagram',
      QUIZ: 'Resolver Quiz',
      SURVEY: 'Responder Pesquisa',
      FILE: 'Enviar Arquivo de Verificação'
    }
  }
  return (names[current] || names.ko)[type] || type
}

const hasFinancialRewards = computed(() => {
  return rewards.value.some(r => r.currency !== 'OTHER' && r.amount > 0)
})

const financialRewardsList = computed(() => {
  return rewards.value.filter(r => r.currency !== 'OTHER' && r.amount > 0)
})

const hasOtherRewards = computed(() => {
  return rewards.value.some(r => r.currency === 'OTHER' && r.amount > 0)
})

const otherRewardsList = computed(() => {
  return rewards.value.filter(r => r.currency === 'OTHER' && r.amount > 0)
})

const getCurrencyEmoji = (currency: string) => {
  const c = (currency || '').toUpperCase()
  if (c === 'POINT' || c === 'P') return '🪙'
  if (c === 'USDT') return '💵'
  if (c === 'METAQ') return '💎'
  if (c === 'BRL') return '🇧🇷'
  return '🎁'
}

const formatRewardText = (r: any) => {
  const perPerson = Math.floor(r.amount / (winnerCount.value || 1))
  return `${r.currency === 'POINT' || r.currency === 'P' ? '포인트' : r.currency} ${perPerson.toLocaleString()}${r.currency === 'POINT' || r.currency === 'P' ? 'P' : ' ' + r.currency}`
}


function goToStep(step: number) {
  err.value = ''
  currentStep.value = step
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function nextStep() {
  err.value = ''
  if (currentStep.value === 1) {
    if (!title.value.trim()) {
      err.value = t('ops.titleRequired')
      return
    }
  }
  if (currentStep.value === 2) {
    if (!isStep2Valid.value) {
      err.value = t('error.logisticsRequired') || 'Please complete Step 2 (Winner count and rewards)'
      return
    }
  }
  if (currentStep.value === 3) {
    if (!isStep3Valid.value) {
      err.value = t('error.missionsRequired') || 'Please add at least one mission'
      return
    }
    const v = validateRows(missionRows.value)
    if (v) {
      err.value = v
      return
    }
  }
  if (currentStep.value < 4) {
    currentStep.value++
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const showLeaveModal = ref(false)
const showRestoreModal = ref(false)
const pendingRoute = ref<any>(null)
const pendingRestoreData = ref<any>(null)
const isSubmitting = ref(false)

const isFormDirty = computed(() => {
  return !!(
    title.value.trim() ||
    description.value.trim() ||
    companyName.value.trim() ||
    winnerCount.value !== 1 ||
    rewards.value.some(r => r.amount > 0) ||
    rewards.value.length > 1 ||
    missionRows.value.some(m => m.title.trim() || m.description.trim()) ||
    missionRows.value.length > 1 ||
    companyLogoUrl.value ||
    rewardImageUrl.value
  )
})

onBeforeRouteLeave((to, _, next) => {
  if (isSubmitting.value || !isFormDirty.value) {
    next()
    return
  }
  pendingRoute.value = to
  showLeaveModal.value = true
  next(false)
})

function handleSaveAndExit() {
  saveToLocalStorage()
  showLeaveModal.value = false
  isSubmitting.value = true
  if (pendingRoute.value) {
    router.push(pendingRoute.value)
  }
}

function handleDiscardAndExit() {
  localStorage.removeItem('temp_campaign_form')
  showLeaveModal.value = false
  isSubmitting.value = true
  if (pendingRoute.value) {
    router.push(pendingRoute.value)
  }
}

function saveToLocalStorage() {
  const dataToSave = {
    currentStep: currentStep.value,
    companyName: companyName.value,
    companyLogoUrl: companyLogoUrl.value,
    title: title.value,
    description: description.value,
    winnerCount: winnerCount.value,
    lotteryMode: lotteryMode.value,
    autoApprove: autoApprove.value,
    startsAt: startsAt.value,
    endsAt: endsAt.value,
    rewardImageUrl: rewardImageUrl.value,
    rewards: JSON.parse(JSON.stringify(rewards.value)),
    missionRows: JSON.parse(JSON.stringify(missionRows.value))
  }
  localStorage.setItem('temp_campaign_form', JSON.stringify(dataToSave))
}

function restoreForm() {
  if (!pendingRestoreData.value) return
  const data = pendingRestoreData.value
  currentStep.value = data.currentStep || 1
  companyName.value = data.companyName || ''
  companyLogoUrl.value = data.companyLogoUrl || ''
  title.value = data.title || ''
  description.value = data.description || ''
  winnerCount.value = data.winnerCount || 1
  lotteryMode.value = data.lotteryMode || 'SIMPLE'
  autoApprove.value = data.autoApprove !== undefined ? data.autoApprove : true
  startsAt.value = data.startsAt || ''
  endsAt.value = data.endsAt || ''
  rewardImageUrl.value = data.rewardImageUrl || ''
  rewards.value = data.rewards || [{ amount: 0, currency: 'POINT' }]
  missionRows.value = data.missionRows || [emptyMissionRow(0)]
  
  showRestoreModal.value = false
  pendingRestoreData.value = null
}

function discardRestore() {
  localStorage.removeItem('temp_campaign_form')
  showRestoreModal.value = false
  pendingRestoreData.value = null
}

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (isFormDirty.value && !isSubmitting.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  
  const savedDataStr = localStorage.getItem('temp_campaign_form')
  if (savedDataStr) {
    try {
      const savedData = JSON.parse(savedDataStr)
      pendingRestoreData.value = savedData
      showRestoreModal.value = true
    } catch (e) {
      localStorage.removeItem('temp_campaign_form')
    }
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

async function save() {
  err.value = ''
  
  if (!isStep1Valid.value) {
    err.value = t('ops.titleRequired')
    currentStep.value = 1
    return
  }
  if (!isStep2Valid.value) {
    err.value = t('error.logisticsRequired') || 'Please complete Step 2 (Winner count and rewards)'
    currentStep.value = 2
    return
  }
  if (!isStep3Valid.value) {
    err.value = t('error.missionsRequired') || 'Please add at least one mission'
    currentStep.value = 3
    return
  }

  const v = validateRows(missionRows.value)
  if (v) {
    err.value = v
    return
  }
  const missions = missionRows.value.map((r, i) => rowToPayload(r, i))
  try {
    const { data } = await api.post<{ id: string }>('/campaigns', {
      title: title.value.trim(),
      description: description.value,
      companyName: companyName.value.trim(),
      companyLogoUrl: companyLogoUrl.value.trim(),
      rewardImageUrl: rewardImageUrl.value.trim(),
      winnerCount: winnerCount.value,
      lotteryMode: lotteryMode.value,
      autoApprove: autoApprove.value,
      totalRewardPoints: rewards.value[0]?.amount || 0, // Legacy fallback
      rewardCurrency: rewards.value[0]?.currency || "POINT", // Legacy fallback
      rewardsConfig: rewards.value,
      startsAt: startsAt.value ? new Date(startsAt.value).toISOString() : null,
      endsAt: endsAt.value ? new Date(endsAt.value).toISOString() : null,
      missions,
    })
    localStorage.removeItem('temp_campaign_form')
    isSubmitting.value = true
    await router.replace(`/ops/campaigns/${data.id}`)
  } catch {
    err.value = t('ops.saveFail')
  }
}
</script>

<template>
  <div class="creator-form-page">
    <h1 class="page-title">{{ $t('ops.createTitle') }}</h1>
    
    <!-- Step Indicator -->
    <div class="step-indicator">
      <div 
        v-for="step in 4" 
        :key="step" 
        class="step-item" 
        :class="{ 
          active: currentStep === step, 
          completed: (step === 1 && isStep1Valid) || (step === 2 && isStep2Valid) || (step === 3 && isStep3Valid) || (step === 4 && isStep4Valid)
        }"
        @click="goToStep(step)"
      >
        <div class="step-num">
          <template v-if="step === 1 && isStep1Valid">✓</template>
          <template v-else-if="step === 2 && isStep2Valid">✓</template>
          <template v-else-if="step === 3 && isStep3Valid">✓</template>
          <template v-else-if="step === 4 && isStep4Valid">✓</template>
          <template v-else>{{ step }}</template>
        </div>
        <span class="step-label">
          {{ step === 1 ? $t('ops.step1') || 'Basic' : step === 2 ? $t('ops.step2') || 'Logistics' : step === 3 ? $t('ops.step3') || 'Missions' : $t('ops.step4') || 'Preview' }}
        </span>
      </div>
    </div>

    <form class="stack" @submit.prevent="save">
      <!-- Step 1: Client & Campaign Info -->
      <div v-if="currentStep === 1" class="step-content">
        <!-- Step Guide Banner -->
        <div class="step-guide-card">
          <div class="guide-header">
            <span class="guide-icon">💡</span>
            <h3 class="guide-title">{{ stepGuides.step1Title }}</h3>
          </div>
          <p class="guide-lead">{{ stepGuides.step1Lead }}</p>
          <ul class="guide-list">
            <li v-for="(tip, idx) in stepGuides.step1Tips" :key="idx">
              <span class="guide-bullet">✦</span>
              <span v-html="tip"></span>
            </li>
          </ul>
        </div>

        <section class="card">
          <h2 class="section-title">{{ $t('ops.clientSection') }}</h2>
          <div class="field">
            <label>{{ $t('ops.companyName') }}</label>
            <input v-model="companyName" :placeholder="t('ops.companyNameHint') || '○○ Co., Ltd.'" />
          </div>
          <div class="field">
            <label>{{ $t('ops.companyLogo') }}</label>
            <div class="logo-row">
              <img v-if="companyLogoUrl" :src="getFileUrl(companyLogoUrl)" alt="" class="logo-preview" />
              <div class="logo-actions">
                <input
                  ref="logoFileInput"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                  class="sr-only"
                  @change="onLogoFile"
                />
                <button type="button" class="btn" :disabled="logoUploading" @click="logoFileInput?.click()">
                  {{ logoUploading ? $t('ops.uploading') : $t('ops.selectFile') }}
                </button>
                <button v-if="companyLogoUrl" type="button" class="btn" @click="clearLogo">{{ $t('ops.remove') }}</button>
              </div>
            </div>
            <p class="hint">{{ $t('ops.logoHint') }}</p>
          </div>
        </section>

        <section class="card">
          <h2 class="section-title">{{ $t('ops.campaignSection') }}</h2>
          <div class="field">
            <label>{{ $t('ops.campaignTitle') }}</label>
            <input v-model="title" required />
          </div>
          <div class="field">
            <label>{{ $t('ops.description') }}</label>
            <RichEditor v-model="description" :placeholder="t('ops.descPlaceholder')" />
          </div>
        </section>
      </div>

      <!-- Step 2: Logistics & Rewards -->
      <div v-if="currentStep === 2" class="step-content">
        <!-- Step Guide Banner -->
        <div class="step-guide-card">
          <div class="guide-header">
            <span class="guide-icon">⚖️</span>
            <h3 class="guide-title">{{ stepGuides.step2Title }}</h3>
          </div>
          <p class="guide-lead">{{ stepGuides.step2Lead }}</p>
          <ul class="guide-list">
            <li v-for="(tip, idx) in stepGuides.step2Tips" :key="idx">
              <span class="guide-bullet">✦</span>
              <span v-html="tip"></span>
            </li>
          </ul>
        </div>

        <section class="card">
          <h2 class="section-title">{{ $t('ops.logisticsSection') || 'Logistics' }}</h2>
          <div class="field">
            <label>{{ $t('ops.winnerCount') }}</label>
            <input v-model.number="winnerCount" type="number" min="1" required />
          </div>
          <div class="field">
            <label>{{ $t('ops.lotteryMode') }}</label>
            <select v-model="lotteryMode">
              <option value="SIMPLE">{{ $t('ops.lotterySimple') }}</option>
              <option value="WEIGHTED">{{ $t('ops.lotteryWeighted') }}</option>
            </select>
          </div>
          <label style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 1.5rem">
            <input v-model="autoApprove" type="checkbox" />
            {{ $t('ops.autoApprove') }}
          </label>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem">
            <div class="field">
              <label>{{ $t('ops.startsAt') }}</label>
              <input v-model="startsAt" type="datetime-local" />
            </div>
            <div class="field">
              <label>{{ $t('ops.endsAt') }}</label>
              <input v-model="endsAt" type="datetime-local" />
            </div>
          </div>

          <div class="field reward-box">
            <label>{{ $t('ops.totalReward') }}</label>
            <div v-for="(r, idx) in rewards" :key="idx" style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem">
              <div style="display: flex; gap: 0.5rem">
                <input v-model.number="r.amount" type="number" min="0" step="1" placeholder="1000" style="flex: 1" />
                <select v-model="r.currency" style="width: 120px">
                  <option value="POINT">{{ $t('common.point') || 'POINT' }}</option>
                  <option value="USDT">USDT</option>
                  <option value="BRL">BRL ({{ $t('common.brl') || 'Real' }})</option>
                  <option value="METAQ">METAQ ({{ $t('common.metaq') || 'Coin' }})</option>
                  <option value="OTHER">기타 보상</option>
                </select>
                <button v-if="rewards.length > 1" type="button" class="btn outline" @click="removeReward(idx)">✕</button>
              </div>
              <div v-if="r.currency === 'OTHER'" style="display: flex; gap: 0.5rem">
                <input v-model="r.customCurrency" type="text" placeholder="보상명 (예: 스타벅스 디저트 쿠폰, 문화상품권 등)" style="flex: 1" required />
              </div>
            </div>
            <button type="button" class="btn btn-sm" style="margin-bottom: 1rem" @click="addReward">+ {{ $t('ops.addReward') || 'Add Reward' }}</button>
            
            <div v-if="winnerCount > 0" class="reward-hint">
              <p v-for="(r, idx) in rewards" :key="idx">
                • {{ r.currency === 'OTHER' ? (r.customCurrency || '기타 보상') : r.currency }}: {{ Math.floor(r.amount / winnerCount).toLocaleString() }}{{ r.currency === 'OTHER' ? '개' : '/' + ($t('common.person') || 'person') }}
              </p>
            </div>
          </div>

          <!-- Reward Image Upload Field -->
          <div class="field" style="margin-top: 1.5rem;">
            <label>{{ locale === 'ko' ? '보상 이미지' : 'Reward Image' }}</label>
            <div class="logo-row">
              <img v-if="rewardImageUrl" :src="getFileUrl(rewardImageUrl)" alt="" class="logo-preview" style="object-fit: contain; background: #f8fafc;" />
              <div v-else class="logo-preview-placeholder" style="width: 80px; height: 80px; border-radius: 8px; border: 2px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #94a3b8;">🎁</div>
              <div class="logo-actions">
                <input
                  ref="rewardImageFileInput"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                  class="sr-only"
                  @change="onRewardImageFile"
                />
                <button type="button" class="btn" :disabled="rewardImageUploading" @click="rewardImageFileInput?.click()">
                  {{ rewardImageUploading ? $t('ops.uploading') : $t('ops.selectFile') }}
                </button>
                <button v-if="rewardImageUrl" type="button" class="btn" @click="clearRewardImage">{{ $t('ops.remove') }}</button>
              </div>
            </div>
            <p class="hint">{{ locale === 'ko' ? '캠페인 카드 및 상세 페이지에 표시될 보상 이미지입니다. (3D 일러스트 또는 상품 사진 권장)' : 'Reward image to be shown on the campaign card and detail page.' }}</p>
          </div>
        </section>
      </div>

      <!-- Step 3: Missions -->
      <div v-if="currentStep === 3" class="step-content">
        <!-- Step Guide Banner -->
        <div class="step-guide-card">
          <div class="guide-header">
            <span class="guide-icon">🚀</span>
            <h3 class="guide-title">{{ stepGuides.step3Title }}</h3>
          </div>
          <p class="guide-lead">{{ stepGuides.step3Lead }}</p>
          <ul class="guide-list">
            <li v-for="(tip, idx) in stepGuides.step3Tips" :key="idx">
              <span class="guide-bullet">✦</span>
              <span v-html="tip"></span>
            </li>
          </ul>
        </div>

        <section class="card">
          <h2 class="section-title">{{ $t('ops.missionSection') }}</h2>
          <MissionListEditor v-model="missionRows" />
        </section>
      </div>

      <!-- Step 4: Preview -->
      <div v-if="currentStep === 4" class="step-content">
        <!-- Step Guide Banner -->
        <div class="step-guide-card">
          <div class="guide-header">
            <span class="guide-icon">👀</span>
            <h3 class="guide-title">{{ stepGuides.step4Title }}</h3>
          </div>
          <p class="guide-lead">{{ stepGuides.step4Lead }}</p>
          <ul class="guide-list">
            <li v-for="(tip, idx) in stepGuides.step4Tips" :key="idx">
              <span class="guide-bullet">✦</span>
              <span v-html="tip"></span>
            </li>
          </ul>
        </div>

        <div class="preview-layout-grid">
          <!-- Left preview box: Campaign List Card -->
          <section class="card preview-card-box">
            <h2 class="section-title">📂 {{ locale === 'ko' ? '목록 카드 미리보기' : locale === 'pt' ? 'Visualização do Cartão' : 'List Card Preview' }}</h2>
            
            <div class="campaign-card-premium card preview-simulated-card">
              <!-- Brand Header (Circular brand logo, brand name, D-day badge) -->
              <div class="card-brand-header">
                <div class="company-brand-info">
                  <img v-if="companyLogoUrl" :src="getFileUrl(companyLogoUrl)" class="brand-logo-circular" alt="" />
                  <div v-else class="brand-logo-fallback">
                    🎁
                  </div>
                  <span class="company-name-txt">{{ companyName || (locale === 'ko' ? '브랜드 이름' : 'Brand Name') }}</span>
                </div>
                <div class="dday-pill-badge">
                  🕒 D-3
                </div>
              </div>

              <!-- Title -->
              <h2 class="campaign-card-title">{{ title || (locale === 'ko' ? '캠페인 제목이 여기에 표시됩니다' : 'Campaign title appears here') }}</h2>

              <!-- Body Content (Left column: Reward badge + text; Right column: Reward image) -->
              <div class="card-body-content">
                <div class="reward-details-col">
                  <div class="reward-label-badge">
                    보상
                  </div>
                  
                  <!-- Row 1: Financial Rewards (POINT, USDT, BRL, METAQ) -->
                  <div v-if="hasFinancialRewards" class="reward-row-wrap financial-row">
                    <div class="reward-scroll-container">
                      <div class="reward-scroll-track" :class="{ 'marquee-active': financialRewardsList.length > 1 }" :style="{ '--marquee-duration': (financialRewardsList.length * 5) + 's' }">
                        <!-- First set -->
                        <div 
                          v-for="(r, rIdx) in financialRewardsList" 
                          :key="'f1-' + rIdx" 
                          class="reward-wrap"
                        >
                          <span class="coin-icon">{{ getCurrencyEmoji(r.currency) }}</span>
                          <span class="reward-val">{{ formatRewardText(r) }}</span>
                        </div>
                        <!-- Duplicated set for seamless marquee loop (only when count > 1) -->
                        <template v-if="financialRewardsList.length > 1">
                          <div 
                            v-for="(r, rIdx) in financialRewardsList" 
                            :key="'f2-' + rIdx" 
                            class="reward-wrap"
                          >
                            <span class="coin-icon">{{ getCurrencyEmoji(r.currency) }}</span>
                            <span class="reward-val">{{ formatRewardText(r) }}</span>
                          </div>
                        </template>
                      </div>
                    </div>
                  </div>

                  <!-- Row 2: Other Rewards (OTHER) -->
                  <div v-if="hasOtherRewards" class="reward-row-wrap other-row">
                    <div v-for="(r, rIdx) in otherRewardsList" :key="'o-' + rIdx" class="reward-text-desc">
                      {{ r.customCurrency || '기타 보상' }}
                    </div>
                  </div>
                </div>
                <div class="card-right-visual">
                  <img v-if="rewardImageUrl" :src="getFileUrl(rewardImageUrl)" class="visual-right-img" alt="Reward Image" />
                  <div v-else class="visual-right-fallback">
                    <span>🎁</span>
                  </div>
                </div>
              </div>

              <!-- Footer Row -->
              <div class="card-footer-row">
                <div class="participants-count-wrap">
                  <span class="part-icon">👤</span>
                  <span class="part-text">{{ winnerCount || 0 }}명</span>
                </div>
                <button type="button" class="action-pill-btn">
                  {{ locale === 'ko' ? '참여하기' : 'Join' }} <span class="chevron">></span>
                </button>
              </div>
            </div>
          </section>

          <!-- Right preview box: Campaign Detail view simulation -->
          <section class="card preview-detail-box">
            <h2 class="section-title">📄 {{ locale === 'ko' ? '상세 페이지 미리보기' : locale === 'pt' ? 'Visualização de Detalhes' : 'Detail Page Preview' }}</h2>
            
            <!-- Browser Mockup frame that looks exactly like the live site -->
            <div class="browser-mockup">
              <!-- Browser Header / Titlebar -->
              <div class="browser-titlebar">
                <div class="browser-dots">
                  <span class="dot red"></span>
                  <span class="dot yellow"></span>
                  <span class="dot green"></span>
                </div>
                <div class="browser-address">
                  <span class="lock-icon">🔒</span>
                  <span class="url-text">pickku.com/campaigns/{{ title ? encodeURIComponent(title.toLowerCase().replace(/\s+/g, '-')) : 'preview' }}</span>
                </div>
              </div>
              
              <!-- Browser Page Content Area with real site's background gradient -->
              <div class="browser-content">
                <div class="simulated-detail-view">
                  <!-- Centered detail header matching CampaignDetailView -->
                  <div class="detail-header">
                    <div v-if="companyLogoUrl || companyName" class="company-brand">
                      <img v-if="companyLogoUrl" :src="getFileUrl(companyLogoUrl)" alt="" class="company-logo" />
                      <span v-if="companyName" class="brand-name">{{ companyName }}</span>
                    </div>
                    
                    <h1 class="page-title">{{ title || (locale === 'ko' ? '캠페인 제목' : 'Campaign Title') }}</h1>
                    <div class="description-text ql-editor" v-html="description || (locale === 'ko' ? '캠페인 상세 설명이 들어가는 자리입니다.' : 'Campaign description goes here.')"></div>
                    
                    <div class="meta-row mt-4">
                      <span class="badge">{{ locale === 'ko' ? '모집 중' : 'Active' }}</span>
                      <span class="meta-item">{{ locale === 'ko' ? `미션 총 ${missionRows.length}개` : `${missionRows.length} Missions` }}</span>
                      
                      <div class="detail-reward-badges">
                        <div v-for="(r, idx) in rewards" :key="idx" class="reward-chip" :class="r.currency.toLowerCase()">
                          <span class="reward-icon">
                            {{ r.currency === 'POINT' ? '🪙' : r.currency === 'USDT' ? '💵' : r.currency === 'METAQ' ? '💎' : '🎁' }}
                          </span>
                          <span class="reward-amount">
                            {{ r.currency === 'OTHER' ? (r.amount.toLocaleString() + '개 (' + (r.customCurrency || '기타 보상') + ')') : (r.amount.toLocaleString() + (r.currency === 'POINT' ? 'P' : ' ' + r.currency)) }}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div class="info-footer mt-4">
                      <p class="reward-notice">
                        {{ locale === 'ko' ? '1인당 획득 예상 보상: ' : 'Estimated Reward Per Winner: ' }}
                        <span v-for="(r, idx) in rewards" :key="idx" class="per-person-item">
                          {{ Number(idx) > 0 ? ' + ' : '' }}
                          {{ r.currency === 'OTHER' ? (Math.floor(r.amount / (winnerCount || 1)).toLocaleString() + '개 (' + (r.customCurrency || '기타 보상') + ')') : (Math.floor(r.amount / (winnerCount || 1)).toLocaleString() + (r.currency === 'POINT' ? 'P' : ' ' + r.currency)) }}
                        </span>
                      </p>
                      <p class="period-text mt-2" v-if="startsAt || endsAt">
                        📅 {{ locale === 'ko' ? '기간: ' : 'Period: ' }} {{ startsAt ? startsAt.replace('T', ' ') : '' }} ~ {{ endsAt ? endsAt.replace('T', ' ') : '' }}
                      </p>
                    </div>
                  </div>

                  <!-- Mission Cards Grid matching CampaignDetailView layout -->
                  <div class="simulated-missions-list mt-6">
                    <h3 class="simulated-list-title">🎯 {{ locale === 'ko' ? '참여 미션 목록' : 'Missions to Complete' }}</h3>
                    <div class="simulated-missions-grid">
                      <div v-for="(m, idx) in missionRows" :key="idx" class="card mission-card simulated-mission-card">
                        <div class="mission-header">
                          <div class="mission-type">
                            <span class="type-icon">
                              {{ m.type === 'CHECKIN' ? '📍' : m.type === 'YOUTUBE_SUB' ? '🔴' : m.type === 'YOUTUBE_LIKE' ? '👍' : m.type === 'TELEGRAM_JOIN' || m.type === 'TELEGRAM_CHANNEL' || m.type === 'TELEGRAM_GROUP' ? '✈️' : m.type === 'DISCORD_JOIN' ? '👾' : m.type === 'INSTAGRAM_FOLLOW' ? '📸' : m.type === 'QUIZ' ? '❓' : m.type === 'SURVEY' ? '📝' : '✨' }}
                            </span>
                          </div>
                          <span class="badge">{{ locale === 'ko' ? '미참여' : 'Not Started' }}</span>
                        </div>

                        <h3 class="mission-title">{{ m.title || getMissionTypeName(m.type) }}</h3>
                        <p class="mission-desc">{{ m.description || (locale === 'ko' ? '미션 수행 조건 및 안내가 표시되는 영역입니다.' : 'Mission description and instructions appear here.') }}</p>

                        <div class="mission-body">
                          <!-- Simulated interactive inputs based on type -->
                          <div v-if="m.type === 'QUIZ'" class="simulated-quiz-box">
                            <p class="quiz-question">
                              {{ m.quizQuestion || (locale === 'ko' ? 'Q. 퀴즈 질문을 입력해 주세요.' : 'Q. Please enter a quiz question.') }}
                            </p>
                            <div v-for="(opt, oIdx) in m.quizOptions.filter(Boolean)" :key="oIdx" class="quiz-option">
                              <input type="radio" disabled :checked="oIdx === m.quizCorrectIndex" />
                              <label>{{ opt }}</label>
                            </div>
                          </div>
                          
                          <div v-else-if="m.type === 'SURVEY'" class="simulated-survey-box">
                            <div v-if="m.surveyNote" class="survey-note">
                              {{ m.surveyNote }}
                            </div>
                            <p class="survey-hint-text">
                              📝 {{ locale === 'ko' ? `의견 작성형 설문 (${m.surveyQuestions?.length || 0}개 질문 구성)` : `Subjective opinion feedback (${m.surveyQuestions?.length || 0} questions)` }}
                            </p>
                          </div>

                          <button type="button" class="btn primary submit-btn">
                            {{ locale === 'ko' ? '미션 완료하기' : 'Complete Mission' }}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <!-- Form Footer -->
      <p v-if="err" class="err">{{ err }}</p>
      <div class="form-footer">
        <button v-if="currentStep > 1" type="button" class="btn outline" @click="prevStep">
          {{ $t('common.prev') || 'Previous' }}
        </button>
        <div style="flex: 1"></div>
        <button v-if="currentStep < 4" type="button" class="btn primary" @click="nextStep">
          {{ $t('common.next') || 'Next' }}
        </button>
        <button v-if="currentStep === 4" class="btn primary" type="submit">
          {{ $t('ops.saveBtn') }}
        </button>
      </div>
    </form>
    
    <!-- ⚠️ 이탈 경고 모달 -->
    <transition name="modal-fade">
      <div v-if="showLeaveModal" class="custom-modal-backdrop">
        <div class="custom-modal-content">
          <div class="modal-emoji">⚠️</div>
          <h2 class="modal-title">
            {{ locale === 'ko' ? '작성 중인 캠페인이 있습니다' : 'Campaign Draft Detected' }}
          </h2>
          <p class="modal-desc">
            {{ locale === 'ko' ? '페이지를 이동하면 작성하던 내용이 손실될 수 있습니다. 진행 상황을 어떻게 처리할까요?' : 'Leaving this page may result in loss of your changes. How would you like to handle your progress?' }}
          </p>
          <div class="modal-btn-group-vertical">
            <button type="button" class="btn primary modal-btn" @click="handleSaveAndExit">
              💾 {{ locale === 'ko' ? '저장하고 나가기' : 'Save & Exit' }}
            </button>
            <button type="button" class="btn danger modal-btn" @click="handleDiscardAndExit">
              🗑️ {{ locale === 'ko' ? '저장하지 않고 나가기' : 'Discard & Exit' }}
            </button>
            <button type="button" class="btn outline modal-btn" @click="showLeaveModal = false">
              ❌ {{ locale === 'ko' ? '계속 작성하기 (취소)' : 'Keep Editing (Cancel)' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 💾 복원 확인 모달 -->
    <transition name="modal-fade">
      <div v-if="showRestoreModal" class="custom-modal-backdrop">
        <div class="custom-modal-content">
          <div class="modal-emoji">✨</div>
          <h2 class="modal-title">
            {{ locale === 'ko' ? '임시 저장된 캠페인이 존재합니다' : 'Temporary Draft Found' }}
          </h2>
          <p class="modal-desc">
            {{ locale === 'ko' ? '이전에 작성 중이던 캠페인 데이터를 불러와 이어서 작성하시겠습니까?' : 'Would you like to load the previously saved campaign data and continue editing?' }}
          </p>
          <div class="modal-btn-group-horizontal">
            <button type="button" class="btn primary modal-btn flex-1" @click="restoreForm">
              {{ locale === 'ko' ? '이어서 작성하기' : 'Continue Progress' }}
            </button>
            <button type="button" class="btn outline modal-btn flex-1" @click="discardRestore">
              {{ locale === 'ko' ? '새로 작성하기' : 'Start Fresh' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.creator-form-page {
  padding-bottom: 5rem;
}
.page-title {
  text-align: center;
}
.stack {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 1000px;
  margin: 0 auto;
}

/* Step Indicator */
.step-indicator {
  display: flex;
  justify-content: center;
  gap: 3rem;
  margin-bottom: 3rem;
  position: relative;
}
.step-indicator::before {
  content: '';
  position: absolute;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 2px;
  background: var(--border);
  z-index: 0;
}
.step-item {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: var(--muted);
  transition: all 0.3s ease;
  cursor: pointer;
}
.step-item:hover {
  transform: translateY(-2px);
}
.step-item:hover .step-num {
  border-color: var(--accent);
  box-shadow: 0 5px 15px var(--accent-soft);
}
.step-num {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--panel);
  border: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}
.step-label {
  font-size: 0.85rem;
  font-weight: 700;
  white-space: nowrap;
}
.step-item.active {
  color: var(--accent);
}
.step-item.active .step-num {
  border-color: var(--accent);
  background: var(--accent);
  color: white;
  box-shadow: 0 0 15px var(--accent-soft);
}
.step-item.completed {
  color: var(--text-h);
}
.step-item.completed .step-num {
  border-color: var(--accent);
  background: var(--panel);
  color: var(--accent);
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.section-title {
  font-size: 1.15rem;
  margin: 0 0 1.25rem;
  color: var(--text-h);
  font-weight: 800;
}

.form-footer {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-top: 1rem;
  margin-top: 1rem;
  border-top: 1px solid var(--border);
}

.reward-box {
  padding: 1.25rem;
  border-radius: 1rem;
  background: var(--accent-soft);
  border: 1px dashed var(--accent-border);
}
.reward-hint {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--accent-border);
  font-size: 0.9rem;
  color: var(--accent);
  font-weight: 600;
}
.logo-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}
.logo-preview {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  object-fit: cover;
  border: 1px solid var(--border);
  background: var(--bg-deep);
}
.logo-actions {
  display: flex;
  gap: 0.75rem;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
.hint {
  font-size: 0.85rem;
  color: var(--muted);
  line-height: 1.4;
}

/* Step Guide Banner CSS */
.step-guide-card {
  background: linear-gradient(135deg, rgba(95, 61, 196, 0.02) 0%, rgba(99, 102, 241, 0.04) 100%);
  border: 1px dashed rgba(95, 61, 196, 0.18);
  border-radius: 1.25rem;
  padding: 1.5rem 1.75rem;
  margin-bottom: 2rem;
  backdrop-filter: blur(10px);
}

:root.dark .step-guide-card {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.03) 0%, rgba(30, 41, 59, 0.3) 100%);
  border-color: rgba(99, 102, 241, 0.18);
}

.guide-header {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 0.5rem;
}

.guide-icon {
  font-size: 1.15rem;
}

.guide-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-h);
  margin: 0;
}

.guide-lead {
  font-size: 0.9rem;
  color: var(--text);
  opacity: 0.85;
  line-height: 1.5;
  margin: 0 0 1rem;
}

.guide-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.guide-list li {
  font-size: 0.85rem;
  color: var(--text);
  line-height: 1.45;
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
}

.guide-bullet {
  color: var(--accent);
  font-weight: bold;
  margin-top: 0.05rem;
}

/* Step 4 Live Preview Layout */
.preview-layout-grid {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  margin-top: 1.5rem;
}

/* Simulated Card styling (matching HomeView / CampaignListView exactly but scoped) */
.preview-card-box {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 1.25rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.preview-simulated-card {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 1.75rem;
  border: 1.5px solid #cbd5e1;
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
  text-align: left;
  max-width: 400px;
  margin: 0 auto;
  width: 100%;
  position: relative;
}

.preview-simulated-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.08);
}

:root.dark .preview-simulated-card {
  background: var(--panel) !important;
  border: 1.5px solid var(--border) !important;
  box-shadow: var(--shadow) !important;
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
  background: #6366f1;
  color: white;
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

:root.dark .company-name-txt {
  color: var(--muted) !important;
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
  color: #6366f1;
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

:root.dark .campaign-card-title {
  color: var(--text-h) !important;
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
  background: #e0e7ff;
  color: #4f46e5;
}

:root.dark .reward-label-badge {
  background: var(--code-bg) !important;
  color: var(--muted) !important;
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

:root.dark .reward-wrap {
  background: rgba(99, 102, 241, 0.15) !important;
  border-color: rgba(99, 102, 241, 0.3) !important;
}

:root.dark .reward-wrap .reward-val {
  color: #818cf8 !important;
}

.reward-text-desc {
  font-size: 1.15rem;
  font-weight: 850;
  color: #1e293b;
  text-align: left;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  max-height: 3rem;
}

:root.dark .reward-text-desc {
  color: var(--text) !important;
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
  background: #f8fafc;
  border: 1px solid #f1f5f9;
}

:root.dark .card-right-visual {
  background: var(--code-bg) !important;
  border-color: var(--border) !important;
}

.visual-right-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.08));
}

.visual-right-fallback {
  font-size: 2rem;
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
  color: #6366f1;
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
  background: #6366f1;
}

.action-pill-btn:hover {
  transform: scale(1.05);
}

.chevron {
  font-weight: 900;
}

/* Simulated Detail View styling */
.preview-detail-box {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 1.25rem;
  padding: 1.5rem;
  width: 100%;
}

/* Browser Mockup styling */
.browser-mockup {
  border: 1px solid var(--border);
  border-radius: 1.25rem;
  overflow: hidden;
  box-shadow: var(--shadow-hover);
  background: var(--panel);
  display: flex;
  flex-direction: column;
  width: 100%;
}

.browser-titlebar {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  background: rgba(220, 215, 230, 0.4);
  border-bottom: 1px solid var(--border);
  padding: 0.75rem 1.25rem;
  flex-shrink: 0;
}

:root.dark .browser-titlebar {
  background: rgba(15, 23, 42, 0.6);
}

.browser-dots {
  display: flex;
  gap: 0.4rem;
}

.browser-dots .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.browser-dots .dot.red { background: #ff5f56; }
.browser-dots .dot.yellow { background: #ffbd2e; }
.browser-dots .dot.green { background: #27c93f; }

.browser-address {
  flex: 1;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  padding: 0.35rem 1rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  max-width: 320px;
  margin: 0 auto;
}

:root.dark .browser-address {
  background: rgba(15, 23, 42, 0.4);
}

.browser-content {
  position: relative;
  padding: 3rem 2rem 4rem;
  min-height: 480px;
  max-height: 720px;
  overflow-y: auto;
  text-align: center;
  background: 
    radial-gradient(at 0% 0%, rgba(108, 92, 231, 0.15) 0px, transparent 50%),
    radial-gradient(at 100% 0%, rgba(0, 210, 211, 0.1) 0px, transparent 50%),
    linear-gradient(180deg, var(--bg) 0%, var(--bg-deep) 100%);
  background-attachment: local;
}

:root.dark .browser-content {
  background: 
    radial-gradient(at 0% 0%, rgba(129, 140, 248, 0.1) 0px, transparent 50%),
    linear-gradient(180deg, var(--bg) 0%, var(--bg-deep) 100%);
}

.simulated-detail-view {
  max-width: 1000px;
  margin: 0 auto;
  text-align: center;
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
}

:root.dark .simulated-detail-view {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.simulated-detail-view .detail-header {
  margin-bottom: 3.5rem;
  text-align: center;
}

.simulated-detail-view .company-brand {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.simulated-detail-view .company-logo {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  object-fit: cover;
  border: 1px solid var(--border);
}

:root.dark .simulated-detail-view .company-logo {
  border-color: var(--border) !important;
}

.simulated-detail-view .brand-name {
  font-weight: 800;
  font-size: 1.15rem;
  color: var(--text-h);
}

.simulated-detail-view .description-text {
  margin: 0 auto 1.5rem;
  max-width: 40rem;
  line-height: 1.7;
  color: var(--text);
  font-size: 1.05rem;
  text-align: center;
}

.simulated-detail-view .meta-row {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 1rem;
}

.simulated-detail-view .meta-item {
  font-size: 0.9rem;
  color: var(--muted);
  font-weight: 600;
}

.simulated-detail-view .badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.75rem;
  border-radius: 0.5rem;
  background: var(--mint-soft);
  color: var(--mint);
  border: 1px solid var(--mint-soft);
}

.simulated-detail-view .detail-reward-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.simulated-detail-view .reward-chip {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.75rem;
  border-radius: 0.75rem;
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 800;
  font-size: 1rem;
  border: 1px solid var(--accent-border);
  white-space: normal;
  word-break: keep-all;
}

.simulated-detail-view .reward-chip.usdt { background: #e6fffa !important; color: #008a76 !important; border-color: #b2f5ea !important; }
.simulated-detail-view .reward-chip.metaq { background: #fff5f7 !important; color: #d53f8c !important; border-color: #fed7e2 !important; }
.simulated-detail-view .reward-chip.point { background: var(--accent-soft) !important; color: var(--accent) !important; border-color: var(--accent-border) !important; }
.simulated-detail-view .reward-chip.other { background: #f0f4f8 !important; color: #475569 !important; border-color: #cbd5e1 !important; }

.simulated-detail-view .info-footer {
  margin-top: 1rem;
  background: transparent;
  padding: 0;
}

.simulated-detail-view .reward-notice {
  font-size: 0.95rem;
  color: var(--muted);
  font-weight: 700;
  margin-bottom: 0.5rem;
  text-align: center;
}

.simulated-detail-view .per-person-item {
  color: var(--accent);
}

.simulated-detail-view .period-text {
  font-size: 0.9rem;
  color: var(--muted);
  font-weight: 600;
  text-align: center;
}

.simulated-missions-list {
  margin-top: 3.5rem;
}

.simulated-list-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text-h);
  margin-bottom: 1.5rem;
  text-align: left;
}

.simulated-missions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
}

/* Simulated Mission Card styles matching actual detail page */
.simulated-mission-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.5rem;
  background: var(--panel);
  backdrop-filter: blur(16px);
  box-shadow: var(--shadow);
  transition: all 0.3s cubic-bezier(0.2, 1, 0.2, 1);
  position: relative;
  overflow: hidden;
  text-align: left;
}

.simulated-mission-card .mission-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
  width: 100%;
}

.simulated-mission-card .mission-type {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}

.simulated-mission-card .type-icon {
  font-size: 1.75rem;
}

.simulated-mission-card .mission-title {
  font-size: 1.3rem;
  margin: 0 0 0.75rem;
  color: var(--text-h);
  font-weight: 800;
  line-height: 1.3;
  overflow-wrap: break-word;
  text-align: left;
}

.simulated-mission-card .mission-desc {
  margin: 0 0 1.5rem;
  font-size: 0.95rem;
  color: var(--text);
  line-height: 1.6;
  text-align: left;
}

.simulated-mission-card .mission-body {
  border-top: 1px solid var(--border);
  padding-top: 1.5rem;
  margin-top: auto;
  text-align: left;
  width: 100%;
}

.simulated-mission-card .survey-note {
  font-size: 0.9rem;
  color: var(--muted);
  margin-bottom: 1.5rem;
  border-left: 4px solid var(--accent);
  padding-left: 1rem;
  line-height: 1.6;
  text-align: left;
}

.simulated-mission-card .quiz-question {
  margin: 0 0 1rem;
  font-weight: 800;
  font-size: 1rem;
  text-align: left;
}

.simulated-mission-card .quiz-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.6rem;
  text-align: left;
}

.simulated-mission-card .quiz-option label {
  cursor: pointer;
  font-weight: 600;
}

.simulated-mission-card .survey-hint-text {
  font-size: 0.85rem;
  color: var(--muted);
  margin: 0 0 0.5rem;
  text-align: left;
}

.simulated-mission-card .submit-btn {
  margin-top: 2rem;
  width: 100%;
  height: 3.5rem;
  font-size: 1.1rem;
  border-radius: 14px;
}

/* ==========================================
   ✨ PREMIUM CUSTOM DIALOG MODALS STYLE
   ========================================== */
.custom-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.custom-modal-content {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 24px;
  width: 90%;
  max-width: 440px;
  padding: 2.2rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  text-align: center;
  animation: modal-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modal-pop {
  from {
    transform: scale(0.9) translateY(10px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.modal-emoji {
  font-size: 2.8rem;
  margin-bottom: 1rem;
}

.modal-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--text-h);
  margin-bottom: 0.8rem;
}

.modal-desc {
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--muted);
  margin-bottom: 2rem;
}

.modal-btn-group-vertical {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.modal-btn-group-horizontal {
  display: flex;
  gap: 0.75rem;
}

.modal-btn {
  height: 3.2rem;
  font-size: 1rem;
  font-weight: 700;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 100%;
}

.flex-1 {
  flex: 1;
}

/* Modal Fade Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>

