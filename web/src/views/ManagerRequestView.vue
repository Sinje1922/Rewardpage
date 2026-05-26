<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { api } from '../api/client'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
const auth = useAuthStore()
const router = useRouter()

const companyName = ref('')
const contactName = ref('')
const email = ref('')
const phone = ref('')
const businessType = ref('')
const message = ref('')

const loading = ref(false)
const submitting = ref(false)
const error = ref('')
const success = ref(false)
const myRequests = ref<any[]>([])

const localText = computed(() => {
  const current = locale.value || 'ko'
  const dict: Record<string, any> = {
    ko: {
      title: '매니저 권한 신청',
      lead: 'Pickku에서 캠페인을 생성하고 관리할 수 있는 MANAGER 권한을 신청하세요.<br />신청 정보는 관리자가 검토 후 승인 시 즉시 반영됩니다.',
      companyName: '회사명 / 브랜드명',
      companyNamePlaceholder: '예: 주식회사 픽쿠',
      contactName: '담당자 성함',
      contactNamePlaceholder: '예: 홍길동',
      email: '연락처 이메일',
      emailPlaceholder: '예: contact@pickku.com',
      phone: '연락처 전화번호 (선택)',
      phonePlaceholder: '예: 010-1234-5678',
      businessType: '업종',
      businessTypeSelect: '업종을 선택해주세요',
      businessTypes: {
        IT: 'IT / 기술',
        COMMERCE: '이커머스 / 쇼핑',
        MARKETING: '마케팅 / 광고',
        FASHION: '패션 / 뷰티',
        FOOD: 'F&B / 푸드',
        ENTERTAINMENT: '엔터테인먼트 / 미디어',
        GAME: '게임',
        EDUCATION: '교육',
        FINANCE: '금융 / 핀테크',
        OTHER: '기타'
      },
      message: '캠페인 운영 목적 및 소개',
      messagePlaceholder: '운영하고자 하는 캠페인의 목적, 진행하고 싶은 미션 내용, 타겟층 등을 상세히 작성해 주시면 승인이 더 빨라집니다.',
      submit: '매니저 권한 신청하기',
      submitting: '신청서 제출 중...',
      successTitle: '신청 완료! 🎉',
      successDesc: '매니저 권한 신청이 성공적으로 제출되었습니다.<br />관리자가 신청 내용을 신속하게 검토한 후 승인할 예정입니다. 조금만 기다려 주세요!',
      backToHome: '홈으로 돌아가기',
      alreadySubmittedTitle: '이미 신청하셨습니다',
      alreadySubmittedDesc: '현재 대기 중인 신청 건이 존재합니다. 관리자 승인을 기다려주세요.',
      alreadyManagerTitle: '이미 매니저 권한을 가지고 있습니다',
      alreadyManagerDesc: '회원님은 이미 MANAGER 또는 ADMIN 권한을 보유하고 있어 추가 신청이 필요하지 않습니다.',
      historyTitle: '나의 신청 내역',
      statusPending: '검토 대기중',
      statusApproved: '승인됨',
      statusRejected: '거절됨',
      appliedAt: '신청일',
      reason: '관리자 의견',
      errorFillAll: '필수 입력 사항을 모두 입력해 주세요.',
      
      // Benefits & Privileges
      benefitsTitle: 'Pickku 캠페인 개설 혜택',
      benefitsLead: '매니저로 승격되면 직접 브랜드 캠페인을 생성하고 강력한 마케팅 효과를 누릴 수 있습니다.',
      benefit1Title: '폭발적인 소셜 커뮤니티 성장',
      benefit1Desc: '유튜브 구독, 텔레그램 채널 가입/시작, 디스코드 입장 등 맞춤형 소셜 미션을 걸어 최단 시간 내에 진성 구독자와 커뮤니티 멤버를 대거 확보할 수 있습니다.',
      benefit2Title: '정밀한 사용자 행동 전환',
      benefit2Desc: '단순한 노출을 넘어 브랜드와 관련된 퀴즈 풀기, 동영상 일정 시간 시청, 특정 웹사이트 방문 등 정교한 액션 수행을 유도합니다.',
      benefit3Title: '가중치 기반 공정 보상 분배',
      benefit3Desc: '체리 피커를 완벽하게 배제하는 픽쿠만의 가중치 추첨 알고리즘을 활용하여, 더 활발하고 정성껏 참여한 진성 회원에게 더 높은 당첨 가중치를 제공합니다.',
      benefit4Title: '실시간 분석 & 엑셀 리포트',
      benefit4Desc: '참가 정보 및 미션 완수 통계를 실시간 대시보드로 확인하고, 당첨자 및 참가자 명단을 필터링하여 UTF-8 형식의 Excel로 편리하게 추출할 수 있습니다.',
      privilegeTitle: '👑 매니저 권한 핵심 기능',
      privilegeItem1: '캠페인 무제한 생성 및 다양한 미션 설계',
      privilegeItem2: '미션 참가 신청 실시간 관리 및 수동 승인 권한',
      privilegeItem3: '단순 무작위 및 기여도 비례 가중치 추첨 엔진 실행',
      privilegeItem4: '운영 데이터 분석 및 참가자 엑셀 리포트 추출 권한'
    },
    en: {
      title: 'Apply for Manager Access',
      lead: 'Apply for MANAGER role to create and manage campaigns on Pickku.<br />Admin will review and grant permissions.',
      companyName: 'Company / Brand Name',
      companyNamePlaceholder: 'e.g. Pickku Inc.',
      contactName: 'Contact Name',
      contactNamePlaceholder: 'e.g. John Doe',
      email: 'Contact Email',
      emailPlaceholder: 'e.g. contact@pickku.com',
      phone: 'Phone Number (Optional)',
      phonePlaceholder: 'e.g. +1 234-567-8901',
      businessType: 'Business Type',
      businessTypeSelect: 'Select Business Type',
      businessTypes: {
        IT: 'IT / Tech',
        COMMERCE: 'E-Commerce / Retail',
        MARKETING: 'Marketing / Advertising',
        FASHION: 'Fashion / Beauty',
        FOOD: 'F&B / Food',
        ENTERTAINMENT: 'Entertainment / Media',
        GAME: 'Gaming',
        EDUCATION: 'Education',
        FINANCE: 'Finance / Fintech',
        OTHER: 'Other'
      },
      message: 'Campaign Purpose & Details',
      messagePlaceholder: 'Please describe your campaign purpose, target audience, and type of missions you want to run. More details will speed up the approval process.',
      submit: 'Submit Application',
      submitting: 'Submitting...',
      successTitle: 'Application Submitted! 🎉',
      successDesc: 'Your request has been successfully submitted.<br />An administrator will review your application shortly.',
      backToHome: 'Back to Home',
      alreadySubmittedTitle: 'Already Submitted',
      alreadySubmittedDesc: 'You have a pending application. Please wait for administrator approval.',
      alreadyManagerTitle: 'Already a Manager',
      alreadyManagerDesc: 'You already possess MANAGER or ADMIN permissions. No further request is needed.',
      historyTitle: 'My Applications',
      statusPending: 'Pending',
      statusApproved: 'Approved',
      statusRejected: 'Rejected',
      appliedAt: 'Applied At',
      reason: 'Admin Note',
      errorFillAll: 'Please fill out all required fields.',

      // Benefits & Privileges
      benefitsTitle: 'Pickku Campaign Creator Benefits',
      benefitsLead: 'Becoming a Manager allows you to create your own brand campaigns and leverage powerful social engagement tools.',
      benefit1Title: 'Explosive Social Media Growth',
      benefit1Desc: 'Quickly gain authentic subscribers and community members through tailored missions like YouTube subscribes, Telegram bot links, and Discord server joins.',
      benefit2Title: 'Targeted User Action Conversion',
      benefit2Desc: 'Drive precise actions beyond simple clicks, including correct quiz submissions, video view time completion, or website visits.',
      benefit3Title: 'Weighted Fair Reward System',
      benefit3Desc: 'Utilize Pickku\'s signature weighted draw algorithm to filter out bots and award higher winning probabilities to members with high participation.',
      benefit4Title: 'Real-time Analytics & Excel Export',
      benefit4Desc: 'Access real-time views, check mission completion metrics, and securely export verified winner lists to UTF-8 formatted Excel spreadsheets.',
      privilegeTitle: '👑 Core Manager Features',
      privilegeItem1: 'Unlimited campaign creation with various social media missions',
      privilegeItem2: 'Real-time submission management and manual verification approvals',
      privilegeItem3: 'Direct execution of Simple and Weighted draw engines',
      privilegeItem4: 'Comprehensive operations dashboard and Excel report exports'
    },
    pt: {
      title: 'Solicitar Acesso de Gerente',
      lead: 'Solicite a função de MANAGER para criar e gerenciar campanhas no Pickku.<br />O administrador analisará e concederá permissões.',
      companyName: 'Nome da Empresa / Marca',
      companyNamePlaceholder: 'ex: Pickku Inc.',
      contactName: 'Nome do Contato',
      contactNamePlaceholder: 'ex: João Silva',
      email: 'E-mail de Contato',
      emailPlaceholder: 'ex: contato@pickku.com',
      phone: 'Telefone (Opcional)',
      phonePlaceholder: 'ex: +55 11 99999-9999',
      businessType: 'Tipo de Negócio',
      businessTypeSelect: 'Selecione o Tipo de Negócio',
      businessTypes: {
        IT: 'TI / Tecnologia',
        COMMERCE: 'E-Commerce / Vendas',
        MARKETING: 'Marketing / Publicidade',
        FASHION: 'Moda / Beleza',
        FOOD: 'F&B / Alimentos',
        ENTERTAINMENT: 'Entretenimento / Mídia',
        GAME: 'Jogos',
        EDUCATION: 'Educação',
        FINANCE: 'Finanças / Fintech',
        OTHER: 'Outro'
      },
      message: 'Objetivo da Campanha e Detalhes',
      messagePlaceholder: 'Descreva o objetivo da sua campanha, público-alvo e tipos de missões que deseja executar.',
      submit: 'Enviar Solicitação',
      submitting: 'Enviando...',
      successTitle: 'Solicitação Enviada! 🎉',
      successDesc: 'Sua solicitação foi enviada com sucesso.<br />Um administrador analisará sua solicitação em breve.',
      backToHome: 'Voltar ao Início',
      alreadySubmittedTitle: 'Já Solicitado',
      alreadySubmittedDesc: 'Você já possui uma solicitação pendente. Aguarde a aprovação do administrador.',
      alreadyManagerTitle: 'Já é um Gerente',
      alreadyManagerDesc: 'Você já possui permissão de MANAGER ou ADMIN. Nenhuma nova solicitação é necessária.',
      historyTitle: 'Minhas Solicitações',
      statusPending: 'Pendente',
      statusApproved: 'Aprovado',
      statusRejected: 'Rejeitado',
      appliedAt: 'Solicitado em',
      reason: 'Nota do Admin',
      errorFillAll: 'Por favor, preencha todos os campos obrigatórios.',

      // Benefits & Privileges
      benefitsTitle: 'Benefícios do Criador Pickku',
      benefitsLead: 'Tornar-se um Gerente permite que você crie suas próprias campanhas de marca e utilize ferramentas poderosas de engajamento.',
      benefit1Title: 'Crescimento Explosivo de Mídias Sociais',
      benefit1Desc: 'Ganhe inscritos autênticos rapidamente por meio de missões personalizadas, como inscrições no YouTube, links no Telegram e entradas no Discord.',
      benefit2Title: 'Conversão de Ações Direcionadas',
      benefit2Desc: 'Impulsione ações precisas, incluindo envio de respostas de quiz, visualizações de vídeos por tempo definido ou visitas a sites.',
      benefit3Title: 'Sistema de Recompensa Justo Ponderado',
      benefit3Desc: 'Utilize o algoritmo de sorteio ponderado exclusivo da Pickku para filtrar bots e conceder maiores chances aos membros dedicados.',
      benefit4Title: 'Análises em Tempo Real & Exportação',
      benefit4Desc: 'Acesse estatísticas, verifique métricas de missões e exporte com segurança a lista de vencedores para o formato Excel.',
      privilegeTitle: '👑 Recursos Principais do Gerente',
      privilegeItem1: 'Criação ilimitada de campanhas com missões de mídias sociais',
      privilegeItem2: 'Gerenciamento de inscrições e aprovação manual de verificação',
      privilegeItem3: 'Execução direta de sorteios Simples e Ponderados',
      privilegeItem4: 'Painel de dados abrangente e exportação de relatórios em Excel'
    }
  }
  return dict[current] || dict.ko
})

const isAlreadyManager = computed(() => {
  return auth.user?.role === 'MANAGER' || auth.user?.role === 'ADMIN'
})

const hasPendingRequest = computed(() => {
  return myRequests.value.some(r => r.status === 'PENDING')
})

const fetchMyRequests = async () => {
  if (!auth.token) return
  loading.value = true
  try {
    const { data } = await api.get('/manager-requests/my')
    myRequests.value = data
  } catch (err) {
    console.error('Failed to load my requests:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (auth.user) {
    contactName.value = auth.user.nickname || ''
    email.value = auth.user.email || ''
  }
  fetchMyRequests()
})

const submitRequest = async () => {
  if (!companyName.value || !contactName.value || !email.value || !businessType.value || !message.value) {
    error.value = localText.value.errorFillAll
    return
  }

  submitting.value = true
  error.value = ''

  try {
    await api.post('/manager-requests', {
      companyName: companyName.value,
      contactName: contactName.value,
      email: email.value,
      phone: phone.value || null,
      businessType: businessType.value,
      message: message.value
    })
    success.value = true
    await fetchMyRequests()
  } catch (err: any) {
    console.error('Submit manager request failed:', err)
    if (err.response && err.response.data && err.response.data.error) {
      error.value = err.response.data.error
    } else {
      error.value = 'Failed to submit application. Please try again.'
    }
  } finally {
    submitting.value = false
  }
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString(locale.value === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="request-container fade-in">
    <div class="request-layout">
      <!-- LEFT SIDE: Benefits & Privileges Visual Panel -->
      <div class="info-card">
        <h2 class="section-title">{{ localText.benefitsTitle }}</h2>
        <p class="section-lead">{{ localText.benefitsLead }}</p>

        <!-- 2x2 Benefits Grid with gorgeous SVG visuals -->
        <div class="benefits-grid">
          <!-- Benefit 1: Social Growth -->
          <div class="benefit-card">
            <div class="icon-box red-glow">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div class="benefit-body">
              <h3>{{ localText.benefit1Title }}</h3>
              <p>{{ localText.benefit1Desc }}</p>
            </div>
          </div>

          <!-- Benefit 2: Action Conversion -->
          <div class="benefit-card">
            <div class="icon-box blue-glow">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="6"></circle>
                <circle cx="12" cy="12" r="2"></circle>
              </svg>
            </div>
            <div class="benefit-body">
              <h3>{{ localText.benefit2Title }}</h3>
              <p>{{ localText.benefit2Desc }}</p>
            </div>
          </div>

          <!-- Benefit 3: Weighted Reward -->
          <div class="benefit-card">
            <div class="icon-box purple-glow">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon">
                <circle cx="12" cy="8" r="7"></circle>
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
              </svg>
            </div>
            <div class="benefit-body">
              <h3>{{ localText.benefit3Title }}</h3>
              <p>{{ localText.benefit3Desc }}</p>
            </div>
          </div>

          <!-- Benefit 4: Analytics -->
          <div class="benefit-card">
            <div class="icon-box green-glow">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
            </div>
            <div class="benefit-body">
              <h3>{{ localText.benefit4Title }}</h3>
              <p>{{ localText.benefit4Desc }}</p>
            </div>
          </div>
        </div>

        <!-- Role privileges Definition checklist -->
        <div class="privileges-box">
          <h3 class="privilege-title">{{ localText.privilegeTitle }}</h3>
          <ul class="privileges-list">
            <li>
              <span class="privilege-bullet">✦</span>
              <span>{{ localText.privilegeItem1 }}</span>
            </li>
            <li>
              <span class="privilege-bullet">✦</span>
              <span>{{ localText.privilegeItem2 }}</span>
            </li>
            <li>
              <span class="privilege-bullet">✦</span>
              <span>{{ localText.privilegeItem3 }}</span>
            </li>
            <li>
              <span class="privilege-bullet">✦</span>
              <span>{{ localText.privilegeItem4 }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- RIGHT SIDE: Application Form / Active State Card -->
      <div class="form-and-history-col">
        <div class="request-card main-form">
          <!-- Already a manager state -->
          <div v-if="isAlreadyManager" class="state-container text-center">
            <div class="state-icon check">👑</div>
            <h1 class="state-title">{{ localText.alreadyManagerTitle }}</h1>
            <p class="state-desc">{{ localText.alreadyManagerDesc }}</p>
            <button class="primary-btn mt-6" @click="router.push('/')">{{ localText.backToHome }}</button>
          </div>

          <!-- Success state -->
          <div v-else-if="success" class="state-container text-center">
            <div class="state-icon check">🎉</div>
            <h1 class="state-title">{{ localText.successTitle }}</h1>
            <p class="state-desc" v-html="localText.successDesc"></p>
            <button class="primary-btn mt-6" @click="router.push('/')">{{ localText.backToHome }}</button>
          </div>

          <!-- Already submitted/Pending request state -->
          <div v-else-if="hasPendingRequest" class="state-container text-center">
            <div class="state-icon pending">⌛</div>
            <h1 class="state-title">{{ localText.alreadySubmittedTitle }}</h1>
            <p class="state-desc">{{ localText.alreadySubmittedDesc }}</p>
            <button class="primary-btn mt-6" @click="router.push('/')">{{ localText.backToHome }}</button>
          </div>

          <!-- Regular form state -->
          <div v-else>
            <div class="request-header">
              <h1 class="page-title">{{ localText.title }}</h1>
              <p class="request-lead" v-html="localText.lead"></p>
            </div>

            <form @submit.prevent="submitRequest" class="request-form">
              <div class="form-rows">
                <div class="form-grid-split">
                  <div class="form-group">
                    <label>{{ localText.companyName }} <span class="required">*</span></label>
                    <input v-model="companyName" type="text" :placeholder="localText.companyNamePlaceholder" class="form-input" required />
                  </div>

                  <div class="form-group">
                    <label>{{ localText.contactName }} <span class="required">*</span></label>
                    <input v-model="contactName" type="text" :placeholder="localText.contactNamePlaceholder" class="form-input" required />
                  </div>
                </div>

                <div class="form-grid-split">
                  <div class="form-group">
                    <label>{{ localText.email }} <span class="required">*</span></label>
                    <input v-model="email" type="email" :placeholder="localText.emailPlaceholder" class="form-input" required />
                  </div>

                  <div class="form-group">
                    <label>{{ localText.phone }}</label>
                    <input v-model="phone" type="text" :placeholder="localText.phonePlaceholder" class="form-input" />
                  </div>
                </div>

                <div class="form-group">
                  <label>{{ localText.businessType }} <span class="required">*</span></label>
                  <select v-model="businessType" class="form-input select" required>
                    <option value="">{{ localText.businessTypeSelect }}</option>
                    <option v-for="(name, code) in localText.businessTypes" :key="code" :value="code">{{ name }}</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>{{ localText.message }} <span class="required">*</span></label>
                  <textarea v-model="message" :placeholder="localText.messagePlaceholder" rows="5" class="form-input textarea" required></textarea>
                </div>
              </div>

              <div v-if="error" class="error-msg message-toast error">{{ error }}</div>

              <button type="submit" class="primary-btn" :disabled="submitting">
                <span v-if="submitting">{{ localText.submitting }}</span>
                <span v-else>{{ localText.submit }}</span>
              </button>
            </form>
          </div>
        </div>

        <!-- History Card: Stacked under the form/state card if history exists -->
        <div v-if="myRequests.length > 0" class="request-card history-card animate-slide-in mt-6">
          <h2 class="history-title">{{ localText.historyTitle }}</h2>
          <div class="history-list">
            <div v-for="req in myRequests" :key="req.id" class="history-item" :class="req.status.toLowerCase()">
              <div class="item-header">
                <span class="item-company">{{ req.companyName }}</span>
                <span class="status-badge" :class="req.status.toLowerCase()">
                  {{ req.status === 'PENDING' ? localText.statusPending : (req.status === 'APPROVED' ? localText.statusApproved : localText.statusRejected) }}
                </span>
              </div>
              <div class="item-meta">
                <span>{{ localText.appliedAt }}: {{ formatDate(req.createdAt) }}</span>
                <span>{{ localText.businessType }}: {{ localText.businessTypes[req.businessType] || req.businessType }}</span>
              </div>
              <div v-if="req.adminNote" class="item-admin-note">
                <strong>{{ localText.reason }}:</strong> {{ req.adminNote }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.request-container {
  min-height: calc(100vh - 120px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  position: relative;
  z-index: 1;
}

.request-layout {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 3rem;
  width: 100%;
  max-width: 1200px;
  align-items: start;
}

@media (max-width: 1024px) {
  .request-layout {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
}

/* Redesigned Left Column - Info Card */
.info-card {
  padding: 1.5rem 0.5rem;
}

.section-title {
  font-size: 2.2rem;
  font-weight: 800;
  margin-bottom: 0.75rem;
  color: var(--text-h);
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, var(--text-h) 30%, #5f3dc4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.section-lead {
  font-size: 1.1rem;
  color: var(--text);
  opacity: 0.85;
  line-height: 1.6;
  margin-bottom: 2.5rem;
}

/* Benefits Grid */
.benefits-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  margin-bottom: 2.5rem;
}

@media (min-width: 600px) and (max-width: 1024px) {
  .benefits-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.benefit-card {
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
  transition: all 0.3s ease;
}

.benefit-card:hover {
  transform: translateX(6px);
}

@media (max-width: 600px) {
  .benefit-card:hover {
    transform: none;
  }
}

.icon-box {
  width: 50px;
  height: 50px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid var(--border);
  color: var(--text-h);
  transition: all 0.3s ease;
}

:root.dark .icon-box {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.08);
}

.svg-icon {
  width: 22px;
  height: 22px;
}

/* Visual color accents & glows */
.red-glow {
  color: #ff6b6b;
  box-shadow: 0 4px 20px rgba(255, 107, 107, 0.06);
}
.benefit-card:hover .red-glow {
  background: rgba(255, 107, 107, 0.08);
  border-color: #ff6b6b;
}

.blue-glow {
  color: #4dabf7;
  box-shadow: 0 4px 20px rgba(77, 171, 247, 0.06);
}
.benefit-card:hover .blue-glow {
  background: rgba(77, 171, 247, 0.08);
  border-color: #4dabf7;
}

.purple-glow {
  color: #be4bdb;
  box-shadow: 0 4px 20px rgba(190, 75, 219, 0.06);
}
.benefit-card:hover .purple-glow {
  background: rgba(190, 75, 219, 0.08);
  border-color: #be4bdb;
}

.green-glow {
  color: #51cf66;
  box-shadow: 0 4px 20px rgba(81, 207, 102, 0.06);
}
.benefit-card:hover .green-glow {
  background: rgba(81, 207, 102, 0.08);
  border-color: #51cf66;
}

.benefit-body h3 {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-h);
  margin: 0 0 0.4rem;
}

.benefit-body p {
  font-size: 0.95rem;
  color: var(--text);
  line-height: 1.6;
  margin: 0;
  opacity: 0.85;
}

/* Privileges Box */
.privileges-box {
  background: rgba(95, 61, 196, 0.02);
  border: 1px dashed rgba(95, 61, 196, 0.25);
  border-radius: 1.25rem;
  padding: 1.75rem 2rem;
}

:root.dark .privileges-box {
  background: rgba(99, 102, 241, 0.02);
  border-color: rgba(99, 102, 241, 0.2);
}

.privilege-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-h);
  margin: 0 0 1rem;
}

.privileges-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.privileges-list li {
  font-size: 0.95rem;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 0.85rem;
  line-height: 1.5;
}

.privilege-bullet {
  color: var(--primary);
  font-weight: bold;
}

/* Form and History columns layout */
.form-and-history-col {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* Original Card Styles, optimized */
.request-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 2rem;
  padding: 3rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.04);
  backdrop-filter: blur(20px);
  transition: all 0.3s ease;
  width: 100%;
  box-sizing: border-box;
}

:root.dark .request-card {
  background: rgba(30, 41, 59, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.history-card {
  padding: 2.5rem;
  max-height: 600px;
  overflow-y: auto;
}

.request-header {
  margin-bottom: 2.5rem;
}

.page-title {
  font-size: 2.2rem;
  font-weight: 900;
  margin-bottom: 1rem;
  color: var(--text-h);
  background: linear-gradient(135deg, var(--text-h), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

:root.dark .page-title {
  background: linear-gradient(135deg, #ffffff, var(--accent-bright));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.request-lead {
  color: var(--muted);
  line-height: 1.6;
  font-size: 1.05rem;
}

.request-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-rows {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.required {
  color: #ef4444;
}

.form-input {
  width: 100%;
  padding: 1rem 1.25rem;
  border: 2px solid var(--border);
  border-radius: 16px;
  background: var(--bg-card);
  color: var(--text-h);
  font-size: 1rem;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-input::placeholder {
  color: var(--muted);
  opacity: 0.6;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

:root.dark .form-input {
  background: rgba(15, 23, 42, 0.6);
  border-color: rgba(255, 255, 255, 0.1);
  color: #f8fafc;
}

:root.dark .form-input:focus {
  border-color: var(--accent-bright);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.25);
}

.form-input.select option {
  background: var(--bg-card);
  color: var(--text-h);
}

:root.dark .form-input.select option {
  background: #1e293b;
  color: #f8fafc;
}

.select {
  appearance: none !important;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") !important;
  background-repeat: no-repeat !important;
  background-position: right 1.25rem center !important;
  background-size: 1.2rem !important;
}

:root.dark .select {
  background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ccc' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") !important;
  background-repeat: no-repeat !important;
  background-position: right 1.25rem center !important;
  background-size: 1.2rem !important;
}

.textarea {
  resize: vertical;
  min-height: 120px;
  line-height: 1.6;
}

.form-grid-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

@media (max-width: 600px) {
  .form-grid-split {
    grid-template-columns: 1fr;
  }
  .request-card {
    padding: 2rem 1.5rem;
  }
}

.primary-btn {
  width: 100%;
  padding: 1.25rem;
  background: linear-gradient(135deg, var(--accent), var(--accent-bright));
  color: white;
  border: none;
  border-radius: 20px;
  font-weight: 800;
  font-size: 1.1rem;
  cursor: pointer;
  box-shadow: 0 8px 24px var(--accent-soft);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.primary-btn:hover:not(:disabled) {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px var(--accent-soft);
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.message-toast.error {
  padding: 1rem;
  border-radius: 14px;
  background: #fef2f2;
  color: #ef4444;
  border: 1px solid #fee2e2;
  font-size: 0.9rem;
  font-weight: 700;
  text-align: center;
}

:root.dark .message-toast.error {
  background: rgba(220, 38, 38, 0.15);
  color: #fca5a5;
  border: 1px solid rgba(220, 38, 38, 0.3);
}

.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 0;
}

.state-icon {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 6rem;
  height: 6rem;
  border-radius: 50%;
}

.state-icon.check {
  background: #ecfdf5;
  color: #10b981;
}

:root.dark .state-icon.check {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.state-icon.pending {
  background: #fffbeb;
  color: #f59e0b;
}

:root.dark .state-icon.pending {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.state-title {
  font-size: 1.8rem;
  font-weight: 900;
  color: var(--text-h);
  margin-bottom: 1rem;
}

.state-desc {
  color: var(--muted);
  font-size: 1.05rem;
  line-height: 1.6;
  max-width: 400px;
  margin: 0 auto;
}

.mt-6 {
  margin-top: 1.5rem;
}

.text-center {
  text-align: center;
}

/* History styling */
.history-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-h);
  margin-bottom: 1.5rem;
  border-bottom: 2px solid var(--border);
  padding-bottom: 0.75rem;
}

:root.dark .history-title {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.history-item {
  border-left: 4px solid var(--border);
  background: rgba(0, 0, 0, 0.02);
  padding: 1.25rem;
  border-radius: 0 16px 16px 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

:root.dark .history-item {
  background: rgba(255, 255, 255, 0.02);
  border-left-color: rgba(255, 255, 255, 0.1);
}

.history-item.pending {
  border-left-color: #f59e0b;
  background: rgba(245, 158, 11, 0.03);
}

:root.dark .history-item.pending {
  border-left-color: #f59e0b;
  background: rgba(245, 158, 11, 0.05);
}

.history-item.approved {
  border-left-color: #10b981;
  background: rgba(16, 185, 129, 0.03);
}

:root.dark .history-item.approved {
  border-left-color: #10b981;
  background: rgba(16, 185, 129, 0.05);
}

.history-item.rejected {
  border-left-color: #ef4444;
  background: rgba(239, 68, 68, 0.03);
}

:root.dark .history-item.rejected {
  border-left-color: #ef4444;
  background: rgba(239, 68, 68, 0.05);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-company {
  font-weight: 800;
  color: var(--text-h);
}

.status-badge {
  font-size: 0.8rem;
  font-weight: 800;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  text-transform: uppercase;
}

.status-badge.pending {
  background: #fef3c7;
  color: #d97706;
}

:root.dark .status-badge.pending {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.status-badge.approved {
  background: #d1fae5;
  color: #059669;
}

:root.dark .status-badge.approved {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.status-badge.rejected {
  background: #fee2e2;
  color: #dc2626;
}

:root.dark .status-badge.rejected {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

.item-meta {
  font-size: 0.85rem;
  color: var(--muted);
  display: flex;
  justify-content: space-between;
}

.item-admin-note {
  font-size: 0.85rem;
  background: rgba(0, 0, 0, 0.03);
  padding: 0.75rem;
  border-radius: 8px;
  color: var(--text-h);
  border-left: 3px solid var(--border);
  margin-top: 0.5rem;
}

:root.dark .item-admin-note {
  background: rgba(255, 255, 255, 0.04);
  border-left-color: rgba(255, 255, 255, 0.15);
  color: #e2e8f0;
}

.fade-in {
  animation: revealUp 0.8s cubic-bezier(0.2, 1, 0.2, 1) backwards;
}

.animate-slide-in {
  animation: revealUp 1s cubic-bezier(0.2, 1, 0.2, 1) backwards;
}

@keyframes revealUp {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
