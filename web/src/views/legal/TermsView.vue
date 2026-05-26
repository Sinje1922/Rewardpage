<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { locale } = useI18n();
</script>

<template>
  <div class="legal-page card">
    <h1>{{ $t('legal.termsTitle') }}</h1>
    
    <!-- KOREAN TERMS -->
    <div v-if="locale === 'ko'" class="legal-content animate-fade-in">
      <div class="intro-section">
        <p class="subtitle">소셜 미션 기반 Web3 리워드 플랫폼 Pickku 이용약관에 오신 것을 환영합니다.</p>
        <p class="date">시행일자: 2026년 5월 21일</p>
      </div>

      <div class="section">
        <h3>제 1 조 (목적)</h3>
        <p>본 약관은 <strong>Pickku(픽쿠)</strong>(이하 "회사")가 운영하는 소셜 미션형 Web3 리워드 플랫폼 서비스의 이용에 관한 회사와 회원 간의 권리, 의무, 책임 및 기타 필요한 절차적 사항을 규정함을 목적으로 합니다.</p>
      </div>

      <div class="section">
        <h3>제 2 조 (용어의 정의)</h3>
        <p>본 약관에서 사용하는 주요 용어의 정의는 다음과 같습니다.</p>
        <ul class="bullet-list">
          <li><strong>"서비스"</strong>라 함은 회원이 모바일 및 PC 단말기를 통해 접속하여 이용할 수 있는 Pickku 플랫폼 및 관련 제반 리워드 제공 서비스를 의미합니다.</li>
          <li><strong>"소셜 미션 (Quest)"</strong>이라 함은 캠페인 내에서 유튜브 구독, 텔레그램 시작 및 채널 입장, 디스코드 가입, 인스타그램/트위터 팔로우, 특정 퀴즈 풀이 등 외부 SNS 플랫폼의 API 연동 또는 수동 승인을 거쳐 참여 및 달성 여부를 검증받는 행동을 의미합니다.</li>
          <li><strong>"포인트 (P)"</strong>라 함은 회원이 미션을 완료하고 획득하는 가상 가치 지표로서, 플랫폼 내에서 리워드 교환, 추첨 가중치 획득 또는 기타 전용 혜택을 수령하는 용도로 사용됩니다.</li>
          <li><strong>"디지털 지갑 (Wallet)"</strong>이라 함은 블록체인 기반 리워드(EVM 호환 토큰, MetaQ 등)를 투명하고 안전하게 직접 지급받기 위해 회원이 서비스 내에 연동하는 본인 소유의 블록체인 개인 공개 키 주소를 말합니다.</li>
          <li><strong>"추첨 (Draw)"</strong>이라 함은 미션 완수 조건을 충족한 회원 중 리워드 수혜자를 선정하는 자동화 프로세스로서, 동일 확률 기반의 <strong>'단순 무작위 추첨(Simple Draw)'</strong>과 미션 완료도 및 기여 비례 가중에 따른 <strong>'가중치 추첨(Weighted Draw)'</strong> 방식을 포함합니다.</li>
        </ul>
      </div>

      <div class="section">
        <h3>제 3 조 (미션 검증 및 어뷰징 방지 의무)</h3>
        <p>1. 회원은 각 소셜 미션을 실제로 성실하게 완수해야 하며, 시스템 봇(Bot), 멀티 어카운트(다중 계정), 매크로 등 비정상적인 수단으로 미션 완료 조작을 행해서는 안 됩니다.</p>
        <p>2. 미션 완료 즉시 혹은 포인트 수령 직후 연동된 SNS를 통해 구독/팔로우를 즉시 취소하거나, 채널에서 퇴장하는 등 부정한 보상 획득 정황이 확인될 경우, 회사는 사전 통보 없이 해당 회원의 미션 보상 취소, 포인트 회수, 캠페인 당첨 취소 및 서비스 영구 정지 처리를 취할 수 있습니다.</p>
      </div>

      <div class="section">
        <h3>제 4 조 (디지털 지갑 연동 및 면책 사항)</h3>
        <p>1. 회원은 블록체인 토큰 및 암호화 자산 리워드 수령을 위해 등록하는 본인의 디지털 지갑 주소의 정확성과 비밀번호 등의 개인 보안 관리에 전적인 책임을 집니다.</p>
        <p>2. <strong>회원의 잘못된 지갑 주소(Typo, 오기입 등) 등록으로 인해 발생한 리워드 오배송, 자산 손실, 전송 실패 등에 대해 회사는 어떠한 법적·실무적 책임을 부담하지 않으며</strong>, 블록체인 네트워크의 특성상 한 번 실행된 트랜잭션의 취소나 복구는 절대적으로 불가능함을 회원 본인은 명확히 동의합니다.</p>
      </div>

      <div class="section">
        <h3>제 5 조 (포인트의 유효기간 및 소멸)</h3>
        <p>1. 미션 완료 등 플랫폼 활동을 통하여 회원에게 적립된 모든 형태의 일반 포인트의 유효기간은 <strong>최초 적립일로부터 1년(365일)</strong>입니다.</p>
        <p>2. 유효기간 내에 리워드 교환 또는 보상 출금 신청이 이루어지지 않은 포인트는 매월 말일에 자동으로 영구 소멸되며, 소멸된 포인트에 대해서는 재지급이나 복구 조치가 절대 불가합니다.</p>
      </div>

      <div class="section">
        <h3>제 6 조 (추첨 공정성 및 알고리즘 동의)</h3>
        <p>1. 캠페인의 당첨 인원, 보상 지급 형태 및 추첨 방식(단순/가중치)은 캠페인 상세 화면에 사전 명시되며 회원은 이에 기반하여 참여합니다.</p>
        <p>2. 가중치 추첨의 선정 과정은 당사 시스템의 가중치 추첨 알고리즘에 의해 자동 실행되며, 어떠한 인위적인 개입이나 조작도 허용되지 않는 공정 프로세스로 집행됩니다. 회원은 시스템의 독립적 추첨 결과에 무조건적으로 동의합니다.</p>
      </div>
    </div>

    <!-- ENGLISH TERMS -->
    <div v-else-if="locale === 'en'" class="legal-content animate-fade-in">
      <div class="intro-section">
        <p class="subtitle">Welcome to the Terms of Service for Pickku, a social-mission based Web3 reward platform.</p>
        <p class="date">Effective Date: May 21, 2026</p>
      </div>

      <div class="section">
        <h3>Article 1 (Purpose)</h3>
        <p>These Terms of Service regulate the rights, obligations, responsibilities, and procedural details between **Pickku** ("Company") and the members using the social mission-based Web3 reward platform.</p>
      </div>

      <div class="section">
        <h3>Article 2 (Definitions)</h3>
        <p>The key definitions used in these Terms are as follows:</p>
        <ul class="bullet-list">
          <li><strong>"Service"</strong> refers to the Pickku platform and related reward-providing services accessible via mobile and PC.</li>
          <li><strong>"Social Mission (Quest)"</strong> represents campaign actions (e.g., subscribing to YouTube, starting Telegram bots/channels, joining Discord, following Instagram/Twitter, solving quizzes) validated via external SNS APIs or manual reviews.</li>
          <li><strong>"Points (P)"</strong> refers to the in-app digital currency earned upon completing missions, utilized for reward redemptions, draw weights, or other platform benefits.</li>
          <li><strong>"Digital Wallet"</strong> refers to the user's personal EVM-compatible or MetaQ blockchain public wallet address linked within the service to receive token rewards transparently and securely.</li>
          <li><strong>"Draw"</strong> refers to the automated system that selects reward winners among qualified participants. It includes **'Simple Draw'** (equal odds) and **'Weighted Draw'** (odds proportional to mission completion levels and weight parameters).</li>
        </ul>
      </div>

      <div class="section">
        <h3>Article 3 (Mission Verification & Anti-Abuse)</h3>
        <p>1. Members must truthfully complete social missions. The use of automated scripts (bots), multiple fake accounts, macros, or other artificial means to mimic mission completion is strictly prohibited.</p>
        <p>2. Actions such as immediately unsubscribing, leaving groups, or unfollowing SNS channels right after earning points represent bad-faith gaming. In such cases, the Company reserves the right to retrieve points, cancel drawings, and permanently suspend accounts without prior notice.</p>
      </div>

      <div class="section">
        <h3>Article 4 (Digital Wallet Linking & Limitation of Liability)</h3>
        <p>1. Members hold sole and absolute responsibility for the security of their linked blockchain wallets and the accuracy of their public key addresses.</p>
        <p>2. <strong>The Company assumes absolutely no liability for token/asset losses, transaction failures, or misdirected payouts resulting from user typographical errors in their registered wallet addresses.</strong> Due to immutable blockchain network characteristics, transactions cannot be reversed or refunded.</p>
      </div>

      <div class="section">
        <h3>Article 5 (Point Expiration)</h3>
        <p>1. All standard points earned on the platform remain valid for <strong>1 year (365 days) from the date of accumulation</strong>.</p>
        <p>2. Points not converted to rewards or withdrawn within this period will expire automatically on the last day of the corresponding month. Expired points are permanently lost and cannot be recovered.</p>
      </div>

      <div class="section">
        <h3>Article 6 (Draw Fairness & Algorithmic Consent)</h3>
        <p>1. The details, reward types, and draw mechanics (Simple/Weighted) are transparently disclosed on the campaign details tab. Members participate under full awareness of these terms.</p>
        <p>2. The weighted lottery is calculated programmatically using independent lottery formulas without human interference. By participating, members consent unconditionally to the platform's drawing algorithms and results.</p>
      </div>
    </div>

    <!-- PORTUGUESE TERMS -->
    <div v-else class="legal-content animate-fade-in">
      <div class="intro-section">
        <p class="subtitle">Bem-vindo aos Termos de Serviço da Pickku, a plataforma de recompensas Web3 baseada em missões sociais.</p>
        <p class="date">Data de Vigência: 21 de maio de 2026</p>
      </div>

      <div class="section">
        <h3>Artigo 1 (Objetivo)</h3>
        <p>Estes Termos de Serviço regulam os direitos, obrigações, responsabilidades e procedimentos entre a **Pickku** ("Empresa") e os membros que utilizam a plataforma de recompensas baseada em missões sociais Web3.</p>
      </div>

      <div class="section">
        <h3>Artigo 2 (Definições)</h3>
        <p>As definições essenciais utilizadas nestes Termos são as seguintes:</p>
        <ul class="bullet-list">
          <li><strong>"Serviço"</strong> refere-se à plataforma Pickku e serviços associados de recompensas acessíveis por dispositivos móveis e computadores.</li>
          <li><strong>"Missão Social (Quest)"</strong> representa ações em campanhas (ex: se inscrever no YouTube, iniciar bots/canais no Telegram, entrar no Discord, seguir no Instagram/Twitter, responder a questionários) verificadas via APIs de SNS externos ou análises manuais.</li>
          <li><strong>"Pontos (P)"</strong> refere-se à moeda digital interna do aplicativo acumulada após a conclusão de missões, usada para resgate de recompensas, pesos em sorteios ou outros benefícios da plataforma.</li>
          <li><strong>"Carteira Digital"</strong> refere-se ao endereço da chave pública pessoal da carteira blockchain (compatível com EVM, MetaQ, etc.) vinculada pelo usuário no serviço para receber recompensas de tokens de forma transparente.</li>
          <li><strong>"Sorteio"</strong> refere-se ao processo automático que escolhe ganhadores entre os participantes qualificados. Inclui o <strong>'Sorteio Simples'</strong> (chances iguais) e o <strong>'Sorteio Ponderado'</strong> (probabilidades proporcionais aos níveis de conclusão de missões).</li>
        </ul>
      </div>

      <div class="section">
        <h3>Artigo 3 (Verificação de Missões e Políticas Anti-Abuso)</h3>
        <p>1. Os membros devem concluir honestamente as missões. É estritamente proibido o uso de scripts automáticos (bots), contas falsas múltiplas, macros ou outros meios artificiais para simular a conclusão de missões.</p>
        <p>2. Ações como cancelar imediatamente a inscrição, sair de grupos ou deixar de seguir canais SNS logo após receber pontos representam má-fé. Nesses casos, a Empresa reserva-se o direito de recuperar pontos, cancelar sorteios e suspender contas permanentemente sem aviso prévio.</p>
      </div>

      <div class="section">
        <h3>Artigo 4 (Vínculo de Carteira Digital e Limitação de Responsabilidade)</h3>
        <p>1. Os membros assumem a responsabilidade única e absoluta pela segurança de suas carteiras vinculadas e pela precisão de seus endereços de chave pública.</p>
        <p>2. <strong>A Empresa não assume qualquer responsabilidade por perdas de tokens/ativos, falhas de transação ou pagamentos incorretos decorrentes de erros de digitação do usuário no endereço cadastrado.</strong> Devido às características imutáveis da rede blockchain, as transações não podem ser revertidas ou reembolsadas.</p>
      </div>

      <div class="section">
        <h3>Artigo 5 (Validade de Pontos)</h3>
        <p>1. Todos os pontos padrão obtidos na plataforma através de missões são válidos por <strong>1 ano (365 dias) a partir da data de acúmulo</strong>.</p>
        <p>2. Os pontos não convertidos em recompensas ou retirados dentro desse período expirarão automaticamente no último dia do mês correspondente. Os pontos expirados são perdidos permanentemente e não podem ser recuperados.</p>
      </div>

      <div class="section">
        <h3>Artigo 6 (Equidade de Sorteio e Consentimento Algorítmico)</h3>
        <p>1. Os detalhes, tipos de recompensa e mecânica de sorteio (Simples/Ponderado) são divulgados de forma transparente na guia de detalhes da campanha. Os membros participam com pleno conhecimento destes termos.</p>
        <p>2. O sorteio ponderado é calculado de forma programática por meio de fórmulas de sorteio independentes, sem interferência humana. Ao participar, os membros consentem incondicionalmente com os algoritmos e resultados de sorteio da plataforma.</p>
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
  margin-bottom: 0.85rem;
  font-size: 0.95rem;
  list-style-type: square;
}

.bullet-list li strong {
  color: var(--text-h);
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
</style>

