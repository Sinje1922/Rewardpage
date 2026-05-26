<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { locale } = useI18n();
</script>

<template>
  <div class="legal-page card">
    <h1>{{ $t('legal.privacyTitle') }}</h1>

    <!-- KOREAN PRIVACY POLICY -->
    <div v-if="locale === 'ko'" class="legal-content animate-fade-in">
      <div class="intro-section">
        <p class="subtitle"><strong>Pickku(픽쿠)</strong>는 회원의 개인정보를 소중히 생각하며, 개인정보보호법에 의거하여 안전하고 투명하게 개인정보를 수집 및 처리하고 있습니다.</p>
        <p class="date">시행일자: 2026년 5월 21일</p>
      </div>

      <div class="section">
        <h3>1. 개인정보의 처리 목적</h3>
        <p>회사는 다음의 목적을 위하여 최소한의 개인정보를 처리하며, 목적 외의 용도로는 절대 사용하지 않습니다.</p>
        <ul class="bullet-list">
          <li><strong>회원 가입 및 플랫폼 관리</strong>: 이용자 식별, 중복 가입 방지, 어뷰징/매크로 제한, 연령 검증 및 탈퇴 처리.</li>
          <li><strong>소셜 미션 검증</strong>: 유튜브 구독 여부, 텔레그램 가입 상태, 디스코드 서버 조인 등 회원이 직접 선택한 SNS 소셜 미션의 이행 및 시스템 검증 처리.</li>
          <li><strong>추첨 집행 및 보상 지급</strong>: 단순/가중치 추첨 알고리즘 적용, 당첨 통보, 포인트(P) 지급 및 등록된 디지털 블록체인 지갑 주소로의 리워드 토큰 전송.</li>
          <li><strong>서비스 개선 및 커뮤니케이션</strong>: 고객 문의 대응, 사용성 분석 및 불법적 플랫폼 악용 모니터링.</li>
        </ul>
      </div>

      <div class="section">
        <h3>2. 수집하는 개인정보의 항목</h3>
        <p>서비스의 핵심 기능 제공 및 미션 검증을 위해 수집하는 항목은 다음과 같습니다.</p>
        
        <table class="privacy-table">
          <thead>
            <tr>
              <th>구분</th>
              <th>수집 목적</th>
              <th>상세 개인정보 항목</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="badge-td"><span class="badge req">필수</span></td>
              <td>회원 식별 및 서비스 설정</td>
              <td>구글 간편가입 이메일 주소, 프로필 닉네임, 성별, 출생연도, 거주 국가/지역</td>
            </tr>
            <tr>
              <td class="badge-td"><span class="badge opt">선택 / 참여 시</span></td>
              <td>블록체인 리워드 지급</td>
              <td>EVM 호환 및 전용 블록체인 디지털 지갑 주소 (공개키)</td>
            </tr>
            <tr>
              <td class="badge-td"><span class="badge opt">선택 / 연동 시</span></td>
              <td>SNS 소셜 미션 수행 및 자동 검증</td>
              <td>연동된 제3사 SNS 식별 정보 (텔레그램 사용자 ID, 디스코드 사용자 식별자, 구글/유튜브 채널 정보 및 구독 데이터 등)</td>
            </tr>
            <tr>
              <td class="badge-td"><span class="badge auto">자동 수집</span></td>
              <td>서비스 최적화 및 보안 강화</td>
              <td>IP 주소, 브라우저 유형, OS 유형, 쿠키 정보, 기기 고유 식별자, 접속 및 미션 수행 타임스탬프</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="section">
        <h3>3. 개인정보의 보유 및 이용기간</h3>
        <p>1. 회사는 원칙적으로 회원의 회원 탈퇴 신청 즉시 수집된 개인정보를 지체 없이 영구 파기합니다.</p>
        <p>2. 단, 회원의 어뷰징 및 다중 계정을 이용한 중복 혜택 수령 등 불법적 사용 기록은 <strong>탈퇴일로부터 6개월간</strong> 암호화하여 별도 보관 후 파기합니다.</p>
        <p>3. 상법, 전자상거래 등에서의 소비자보호에 관한 법률 등 관계 법령에 따른 의무 보관 건은 규정 기간(리워드 거래 기록: 5년) 동안 안전하게 보존합니다.</p>
      </div>

      <div class="section">
        <h3>4. 제3자 제공 및 연동 정보 처리</h3>
        <p>회사는 미션의 실시간 자동 인증을 위해 각 제3사 SNS 플랫폼 API(Google API, Telegram Bot API, Discord API 등)에 회원이 동의하여 연동한 토큰 및 채널 식별자를 전달하여 조회를 실행하며, 이 과정에서 미션 수행 목적 외의 사적 데이터 접근이나 전송은 일절 발생하지 않습니다.</p>
      </div>
    </div>

    <!-- ENGLISH PRIVACY POLICY -->
    <div v-else-if="locale === 'en'" class="legal-content animate-fade-in">
      <div class="intro-section">
        <p class="subtitle"><strong>Pickku</strong> values your privacy. We collect and process your personal information securely and transparently in compliance with global privacy regulations.</p>
        <p class="date">Effective Date: May 21, 2026</p>
      </div>

      <div class="section">
        <h3>1. Purposes of Processing</h3>
        <p>We process minimum required personal data for the following specific purposes and never utilize it for unauthorized activities:</p>
        <ul class="bullet-list">
          <li><strong>Registration & Membership Management</strong>: User identification, prevention of duplicate registrations, restriction of automated abuse, and account deletion processing.</li>
          <li><strong>Social Mission Verification</strong>: Confirming the completion of user-selected tasks (such as YouTube subscribing, Telegram channel joining, Discord server entering) via external SNS APIs.</li>
          <li><strong>Lottery Drawing & Payouts</strong>: Executing Simple/Weighted raffle draws, announcing winners, crediting points (P), and transferring token rewards to linked digital wallets.</li>
          <li><strong>Service Enhancements & Support</strong>: Addressing inquiries, conducting analytics, and monitoring platform integrity.</li>
        </ul>
      </div>

      <div class="section">
        <h3>2. Categories of Data Collected</h3>
        <p>The categories of data collected to deliver core features are outlined below:</p>
        
        <table class="privacy-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Purpose</th>
              <th>Data Items Collected</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="badge-td"><span class="badge req">Required</span></td>
              <td>Account Creation & Setup</td>
              <td>Google Account Email, Profile Nickname, Gender, Birth Year, Country/Region of Residence</td>
            </tr>
            <tr>
              <td class="badge-td"><span class="badge opt">Optional / On Payout</span></td>
              <td>Blockchain Payout</td>
              <td>EVM-compatible or dedicated blockchain digital wallet address (Public key)</td>
            </tr>
            <tr>
              <td class="badge-td"><span class="badge opt">Optional / Linked</span></td>
              <td>SNS Mission Verification</td>
              <td>Connected third-party SNS identifiers (Telegram User ID, Discord ID/Tag, Google/YouTube Channel ID & subscription records, etc.)</td>
            </tr>
            <tr>
              <td class="badge-td"><span class="badge auto">Auto</span></td>
              <td>Optimization & Security</td>
              <td>IP Address, Browser/OS type, Cookies, Device Identifier, connection & task timestamps</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="section">
        <h3>3. Data Retention and Destruction</h3>
        <p>1. In principle, we destroy your personal data immediately upon account deletion.</p>
        <p>2. However, to prevent multi-account reward abuse or system exploitation, blocklisted hashes and relevant abuse logs are kept in an encrypted state for <strong>6 months from the date of account deletion</strong>.</p>
        <p>3. Where local trade and commerce laws command retention (e.g. transactional records for audit), we preserve the records for the statutory duration (typically 5 years) securely.</p>
      </div>

      <div class="section">
        <h3>4. Third-Party API Integrations</h3>
        <p>For automated mission verification, Pickku coordinates with third-party SNS APIs (Google API, Telegram Bot API, Discord API, etc.) using your authorized tokens and identifiers. No private or unrelated personal profile data is accessed or shared during this process.</p>
      </div>
    </div>

    <!-- PORTUGUESE PRIVACY POLICY -->
    <div v-else class="legal-content animate-fade-in">
      <div class="intro-section">
        <p class="subtitle">A <strong>Pickku</strong> valoriza sua privacidade. Coletamos e processamos suas informações de forma segura e transparente, em conformidade com os regulamentos globais de privacidade.</p>
        <p class="date">Data de Vigência: 21 de maio de 2026</p>
      </div>

      <div class="section">
        <h3>1. Objetivos do Processamento</h3>
        <p>Processamos dados pessoais mínimos estritamente para os seguintes propósitos específicos:</p>
        <ul class="bullet-list">
          <li><strong>Gerenciamento de Conta & Membros</strong>: Identificação do usuário, prevenção de registros duplicados, bloqueio de bots ou abuso e processamento de exclusão de conta.</li>
          <li><strong>Verificação de Missões Sociais</strong>: Confirmação das ações escolhidas pelo usuário (como inscrição no YouTube, entrada em canais do Telegram ou servidores do Discord) por meio de APIs de redes sociais parceiras.</li>
          <li><strong>Sorteios & Pagamentos</strong>: Execução do sorteio de prêmios simples/ponderados, anúncio de vencedores, crédito de pontos (P) e envio de tokens de recompensa para as carteiras digitais vinculadas.</li>
          <li><strong>Suporte & Melhoria do Serviço</strong>: Resolução de dúvidas de suporte, análise de métricas de uso e monitoramento de segurança da plataforma.</li>
        </ul>
      </div>

      <div class="section">
        <h3>2. Categorias de Dados Coletados</h3>
        <p>As categorias de dados processadas para o funcionamento do sistema são apresentadas abaixo:</p>
        
        <table class="privacy-table">
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Propósito</th>
              <th>Itens de Dados Coletados</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="badge-td"><span class="badge req">Obrigatório</span></td>
              <td>Identificação & Perfil</td>
              <td>E-mail de Login do Google, Apelido do Perfil, Gênero, Ano de Nascimento, País/Região de Residência</td>
            </tr>
            <tr>
              <td class="badge-td"><span class="badge opt">Opcional / Payout</span></td>
              <td>Envio de Criptoativos</td>
              <td>Endereço público da carteira digital blockchain (compatível com EVM ou dedicada)</td>
            </tr>
            <tr>
              <td class="badge-td"><span class="badge opt">Opcional / Vínculo</span></td>
              <td>Verificação de Missões SNS</td>
              <td>Identificadores de redes sociais (ID de usuário do Telegram, ID/Tag do Discord, ID do canal e histórico de inscrições do YouTube, etc.)</td>
            </tr>
            <tr>
              <td class="badge-td"><span class="badge auto">Auto</span></td>
              <td>Otimização & Segurança</td>
              <td>Endereço IP, tipo de navegador/SO, Cookies, identificadores de dispositivo, data e hora da conexão</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="section">
        <h3>3. Retenção e Exclusão de Dados</h3>
        <p>1. Em princípio, destruímos seus dados pessoais permanentemente assim que a exclusão da conta é processada.</p>
        <p>2. No entanto, para evitar que usuários mal-intencionados utilizem contas múltiplas para fraudar campanhas, os registros e hashes de abuso são mantidos criptografados por <strong>6 meses a partir da data de exclusão da conta</strong>.</p>
        <p>3. Dados de transações financeiras e pagamentos de recompensas são conservados de acordo com os requisitos legais locais (por exemplo, 5 anos para auditoria).</p>
      </div>

      <div class="section">
        <h3>4. Integrações de APIs de Terceiros</h3>
        <p>Para verificação automática de missões, a Pickku se integra com as APIs oficiais (Google API, Telegram Bot API, Discord API, etc.) utilizando apenas os identificadores autorizados por você. Nenhum dado pessoal extra ou perfil privado é lido ou compartilhado.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.legal-page {
  padding: 3rem 2.5rem;
  max-width: 860px;
  margin: 0.5rem auto 2.5rem;
  background: var(--bg-card);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border);
  border-radius: 1.5rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  animation: revealUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

.legal-page h1 {
  font-size: 2.2rem;
  margin-bottom: 0.5rem;
  color: var(--text-h);
  font-weight: 800;
  letter-spacing: -0.03em;
  background: linear-gradient(135deg, var(--text-h) 30%, #5f3dc4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.intro-section {
  margin-bottom: 2.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border);
}

.intro-section .subtitle {
  font-size: 1.05rem;
  color: var(--text);
  opacity: 0.85;
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

.intro-section .date {
  font-size: 0.9rem;
  color: var(--text-light);
  font-weight: 500;
}

.legal-content .section {
  margin-bottom: 2.2rem;
}

.legal-content h3 {
  font-size: 1.25rem;
  margin: 0 0 0.85rem;
  color: var(--text-h);
  font-weight: 700;
  letter-spacing: -0.01em;
}

.legal-content p {
  color: var(--text);
  line-height: 1.65;
  margin-bottom: 0.75rem;
  font-size: 1rem;
}

.legal-content strong {
  color: var(--text-h);
  font-weight: 600;
}

.bullet-list {
  padding-left: 1.5rem;
  margin: 1rem 0;
}

.bullet-list li {
  color: var(--text);
  line-height: 1.7;
  margin-bottom: 0.6rem;
  font-size: 0.95rem;
  list-style-type: disc;
}

/* Beautiful responsive details table */
.privacy-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.2rem 0;
  font-size: 0.9rem;
  text-align: left;
}

.privacy-table th, .privacy-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--border);
  color: var(--text);
}

.privacy-table th {
  background: rgba(0, 0, 0, 0.02);
  color: var(--text-h);
  font-weight: 600;
}

.badge-td {
  width: 90px;
}

.badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
}

.badge.req {
  background: rgba(224, 49, 49, 0.08);
  color: #e03131;
}

.badge.opt {
  background: rgba(60, 140, 240, 0.08);
  color: #1c7ed6;
}

.badge.auto {
  background: rgba(134, 142, 150, 0.1);
  color: var(--text-light);
}

.animate-fade-in {
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
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

/* Light / Dark Mode dynamic adjustment guarantee */
:root.dark .legal-page {
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.08);
}
:root.dark .privacy-table th {
  background: rgba(255, 255, 255, 0.02);
}
</style>

