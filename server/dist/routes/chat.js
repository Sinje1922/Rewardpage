import { Router } from "express";
import axios from "axios";
import { prisma } from "../lib/prisma.js";
import { authOptional } from "../middleware/auth.js";
import crypto from "crypto";
const router = Router();
const KB_RESOURCES = {
    ko: {
        platform: `🌟 **Pickku(픽쿠) 플랫폼 소개**
Pickku는 크리에이터와 참여 유저를 잇는 혁신적인 미션 수행형 리워드 플랫폼입니다.
- **주요 기능**: 크리에이터는 홍보를 위한 다채로운 캠페인을 개설하고, 유저들은 캠페인 내 퀘스트(미션)를 완료하여 풍성한 리워드(보상)를 획득할 수 있습니다.
- **재미 요소**: 다양한 퀘스트를 달성하여 티켓을 모으고, 이를 통해 푸짐한 리워드 추첨에 참여해 보세요!`,
        rewards: `🎁 **다양하고 풍성한 보상(Reward) 체계**
Pickku에서는 크리에이터가 설정한 다양한 형태의 리워드를 안전하게 수령할 수 있습니다.
1. **포인트 (POINT)**: 플랫폼 내 기본 화폐로, 수수료 없이 디지털 지산 등으로 교환 및 출금 신청이 가능합니다.
2. **블록체인 토큰 (METAQ)**: 생태계 전용 디지털 토큰 보상입니다.
3. **스테이블 코인 (USDT/USDC)**: 가치가 고정된 디지털 토큰 보상입니다.
4. **기타 보상 (OTHER)**: 크리에이터가 개별적으로 준비한 맞춤형 상품(기프티콘, 백화점 상품권, 구글 기프트카드, 현물 경품 등)으로, 당첨 시 상세 안내에 따라 지급받으실 수 있습니다.`,
        raffle: `🎫 **지능형 추첨(Raffle) 모드 가이드**
캠페인 성격에 따라 두 가지 추첨 모드가 제공됩니다.
1. **일반 추첨 (Simple Raffle)**: 캠페인 내 모든 미션을 성실히 완료한 참가자들을 대상으로, 동등한 확률로 완전 무작위 당첨자를 추첨합니다.
2. **가중치 추첨 (Weighted Raffle)**: 유저가 완료한 미션의 개수(획득한 티켓 개수)가 많을수록 당첨 확률이 기하급수적으로 높아집니다. 열심히 참여할수록 유리합니다!`,
        withdrawal: `🪙 **포인트(P) 출금 및 보상 수령 안내**
획득하신 보상 및 포인트는 쉽고 편리하게 수령 가능합니다.
- **포인트 출금**: '마이페이지(My Page) > 포인트 출금' 메뉴에서 디지털 지갑 주소 또는 지급 정보를 입력하여 출금을 신청할 수 있습니다.
- **지급 기한**: 포인트 출금은 신청 후 관리자의 승인을 거쳐 영업일 기준 1~3일 이내에 안전하게 전송됩니다.
- **수수료 0%**: Pickku는 유저 여러분의 혜택을 극대화하기 위해 포인트 출금 수수료를 전액 지원(0%)하고 있습니다.`,
        greet: `🤖 안녕하세요! **Pickku AI 헬퍼**입니다. 반갑습니다! ✨
저는 Pickku 플랫폼 가이드와 보상 지급, 사용 방법 등을 똑똑하게 알려주는 도우미봇입니다.
궁금하신 점이 있다면 아래 질문 칩을 선택하시거나 직접 편하게 입력해 주세요!`,
        quest: `⚔️ **퀘스트 및 미션 참여 방법 가이드**
퀘스트에 참가하여 보상을 획득하는 과정은 아주 쉽습니다!
1. **캠페인 선택**: 홈 화면이나 '캠페인 둘러보기'에서 흥미로운 캠페인을 골라 터치합니다.
2. **미션 수행**: 영상 시청, SNS 링크 인증, 퀴즈 풀기 등 크리에이터가 준비한 간단한 미션을 차례로 수행합니다.
3. **제출 및 검증**: 모든 미션을 다 마치고 하단의 '제출' 버튼을 누르면 실시간 검증을 거쳐 즉시 참여가 확정되고 포인트 또는 응모권이 지급됩니다!`,
        help: `🆘 **도움이 필요하신가요?**
서비스 이용 중 오류가 나거나 막히는 부분이 있으시다면 다음 방법을 통해 빠르게 해결할 수 있습니다!
- **SNS 연동 오류**: 마이페이지에서 디스코드, 유튜브, 텔레그램 계정이 올바르게 연동되었는지 먼저 확인해 주세요.
- **기타 오류 및 1:1 문의**: 상세 증상을 캡처하여 pickku 공식 고객센터 메일(support@pickku.com)로 보내주시면 운영팀에서 실시간 확인 후 신속히 조치해 드리겠습니다.`,
        thanks: `💖 별씀을요! 도움이 되어서 진심으로 기쁩니다. ✨
더 궁금하신 내용이 생기시면 언제든 편하게 저 Pickku AI 헬퍼를 불러주세요. 
오늘도 행복하고 득템 가득한 하루 보내시길 바랄게요! 🚀`,
        default: `🤖 안녕하세요! **Pickku AI 헬퍼**입니다. 
아래 주제나 궁금한 점을 편하게 질문해 주시면 성심껏 답변해 드릴게요!
- **플랫폼 소개**: Pickku가 어떤 플랫폼인지 궁금해요.
- **보상 체계**: 어떤 종류의 보상을 받을 수 있나요? (기타 보상 등)
- **추첨 방식**: 일반 추첨과 가중치 추첨의 차이는 무엇인가요?
- **포인트 출금**: 적립된 포인트를 출금하는 방법과 수수료는 어떻게 되나요?`
    },
    en: {
        platform: `🌟 **About Pickku Platform**
Pickku is an innovative quest-based reward platform connecting creators and users.
- **Core Function**: Creators open various promotion campaigns, and users complete quests (tasks) within the campaigns to earn attractive rewards.
- **Key Feature**: Complete diverse tasks to collect tickets and participate in exciting reward draws!`,
        rewards: `🎁 **Flexible Reward System**
At Pickku, you can safely receive various types of rewards designed by creators.
1. **Points (POINT)**: The primary platform currency, which can be exchanged or withdrawn with zero fee.
2. **Blockchain Tokens (METAQ)**: Digital token rewards dedicated to our ecosystem.
3. **Stablecoins (USDT/USDC)**: Stable digital tokens pegged to fiat value.
4. **Other Rewards (OTHER)**: Custom rewards prepared by creators (gift cards, shopping vouchers, physical items, etc.). Winners will receive them according to special guides.`,
        raffle: `🎫 **Smart Raffle Modes Guide**
Depending on the campaign settings, two raffle modes are supported:
1. **Simple Raffle**: Draws winners completely at random with equal probability among all participants who finished all quests.
2. **Weighted Raffle**: The more quests you complete (the more tickets you get), the higher your winning probability increases. Hard work pays off!`,
        withdrawal: `🪙 **Point Withdrawal & Reward Claim Guide**
Claiming your hard-earned points and rewards is seamless.
- **Point Withdrawal**: Navigate to 'My Page > Point Withdrawal' to enter your digital wallet address or payout details and request a withdrawal.
- **Processing Time**: Payout requests are verified by the admin and securely sent within 1 to 3 business days.
- **Zero Fees**: To maximize user benefits, Pickku supports 100% zero-fee withdrawals!`,
        greet: `🤖 Hello! I am the **Pickku AI Helper**. Nice to meet you! ✨
I'm here to guide you through the Pickku platform, rewards system, and payouts.
Ask me anything or pick one of the quick chips below to get started!`,
        quest: `⚔️ **Quest and Mission Participation Guide**
It's super simple to complete quests and earn rewards:
1. **Pick a Campaign**: Select an interesting campaign from the Home page or 'Explore Campaigns'.
2. **Complete Tasks**: Perform simple actions such as watching videos, connecting SNS, or solving quizzes.
3. **Submit**: Once done, hit the 'Submit' button to instantly verify your tasks and receive your rewards or entries!`,
        help: `🆘 **Need Help?**
If you experience any issues or get stuck, here are quick fixes:
- **SNS Verification Errors**: Make sure your Discord, YouTube, or Telegram accounts are properly connected in your My Page.
- **Support Contact**: E-mail us with screenshots and description at support@pickku.com. Our support team will assist you shortly!`,
        thanks: `💖 You're very welcome! I'm glad I could help. ✨
If you ever need any more assistance, feel free to open this chat again. 
Have an awesome day and good luck with your campaigns! 🚀`,
        default: `🤖 Hello! I am the **Pickku AI Helper**.
Feel free to ask me anything about the platform, rewards, or raffle rules!
💡 **Frequently Asked Topics**:
- **About Platform**: Tell me more about Pickku.
- **Reward System**: What kind of rewards can I get? (Other rewards)
- **Raffle Modes**: What is the difference between Simple and Weighted Raffles?
- **Point Withdrawal**: How do I withdraw points and are there any fees?`
    },
    pt: {
        platform: `🌟 **Apresentação da Plataforma Pickku**
A Pickku é uma plataforma inovadora de recompensas baseada em tarefas que conecta criadores e usuários.
- **Função Principal**: Os criadores lançam várias campanhas promocionais, e os usuários completam missões (tarefas) para ganhar ótimas recompensas.
- **Divertido**: Conclua diversas tarefas para acumular bilhetes e participar de sorteios incríveis de prêmios!`,
        rewards: `🎁 **Sistema Flexível de Recompensas**
Na Pickku, você pode receber com total segurança diferentes tipos de recompensas configuradas pelos criadores.
1. **Pontos (POINT)**: A moeda base da plataforma, que pode ser resgatada ou sacada com taxa zero.
2. **Tokens de Blockchain (METAQ)**: Recompensas em tokens digitais dedicados ao nosso ecossistema.
3. **Stablecoins (USDT/USDC)**: Criptoativos com valor estável indexados ao dólar.
4. **Outras Recompensas (OTHER)**: Prêmios personalizados oferecidos pelos criadores (vale-presentes, cupons, produtos físicos, etc.). Os vencedores receberão as instruções de resgate após o sorteio.`,
        raffle: `🎫 **Guia de Modos de Sorteio (Raffle)**
Apoiamos dois tipos de sorteio com base na configuração da campanha:
1. **Sorteio Simples (Simple Raffle)**: Sorteia os vencedores de forma totalmente aleatória e com chances iguais entre todos os participantes que concluíram as missões.
2. **Sorteio Ponderado (Weighted Raffle)**: Quanto mais missões você concluir (mais bilhetes ganhar), maior será a sua chance de ganhar. Vale a pena se esforçar!`,
        withdrawal: `🪙 **Saque de Pontos e Resgate de Recompensas**
Resgatar seus pontos e prêmios acumulados é muito simples:
- **Saque de Pontos**: Acesse 'Minha Página > Saque de Pontos', insira seu endereço de carteira digital ou dados de pagamento e solicite o resgate.
- **Prazo de Processamento**: As solicitações são revisadas pelo administrador e enviadas com segurança em até 1 a 3 dias úteis.
- **Taxa 0%**: Para maximizar seus benefícios, a Pickku subsidia 100% das taxas de saque!`,
        greet: `🤖 Olá! Eu sou o **Assistente de IA da Pickku**. Muito prazer! ✨
Estou aqui para ajudar com dúvidas sobre a plataforma, prêmios e saques de pontos.
Pergunte qualquer coisa ou toque em um dos botões abaixo para começar!`,
        quest: `⚔️ **Guia de Participação de Missões e Tarefas**
Acumular prêmios participando de missões é moleza:
1. **Escolha uma Campanha**: Selecione uma campanha em destaque na página inicial.
2. **Complete Missões**: Assista a vídeos, vincule redes sociais ou responda a quizzes.
3. **Envie**: Ao concluir, clique em 'Enviar' para validar instantaneamente e garantir seus pontos ou bilhetes!`,
        help: `🆘 **Precisa de Ajuda?**
Se você encontrar algum erro, tente os seguintes passos:
- **Erros de Redes Sociais**: Verifique se seu Discord, YouTube ou Telegram está vinculado corretamente na sua 'Minha Página'.
- **Contato de Suporte**: Envie um e-mail com fotos do erro para support@pickku.com. Nosso time ajudará você rapidamente!`,
        thanks: `💖 De nada! Fico muito feliz em ajudar. ✨
Se precisar de mais alguma coisa, basta abrir o chat novamente.
Tenha um ótimo dia e boa sorte nos sorteios! 🚀`,
        default: `🤖 Olá! Eu sou o **Assistente de IA da Pickku**.
Sinta-se à vontade para perguntar qualquer coisa sobre a plataforma, prêmios ou regras de sorteio!
💡 **Tópicos Populares**:
- **Sobre a Plataforma**: O que é a Pickku?
- **Recompensas**: Que tipos de prêmios posso ganhar? (Outras recompensas)
- **Modos de Sorteio**: Qual a diferença entre Sorteio Simples e Ponderado?
- **Saque de Pontos**: Como sacar meus pontos e quais são as taxas?`
    }
};
// 키워드 사전 분석 매칭 함수 (다각화 매칭 고도화)
function analyzeMessageOffline(message, locale) {
    const msg = message.toLowerCase().trim();
    const lang = KB_RESOURCES[locale] ? locale : "ko";
    const kb = KB_RESOURCES[lang];
    // 1. 인사말 및 자기소개 감지
    if (msg.includes("안녕") ||
        msg.includes("반가") ||
        msg.includes("하이") ||
        msg.includes("hello") ||
        msg.includes("hi") ||
        msg.includes("ola") ||
        msg.includes("oi") ||
        msg.includes("누구") ||
        msg.includes("이름") ||
        msg.includes("chatbot") ||
        msg.includes("헬퍼") ||
        msg.includes("도우미")) {
        return kb.greet;
    }
    // 2. 플랫폼 소개 감지
    if (msg.includes("소개") ||
        msg.includes("플랫폼") ||
        msg.includes("픽쿠") ||
        msg.includes("pickku") ||
        msg.includes("platform") ||
        msg.includes("sobre") ||
        msg.includes("무엇") ||
        msg.includes("뭐하는")) {
        return kb.platform;
    }
    // 3. 미션 참여 및 퀘스트 수행 감지
    if (msg.includes("퀘스트") ||
        msg.includes("미션") ||
        msg.includes("참여") ||
        msg.includes("수행") ||
        msg.includes("진행") ||
        msg.includes("시작") ||
        msg.includes("quest") ||
        msg.includes("mission") ||
        msg.includes("particip") ||
        msg.includes("como") ||
        msg.includes("어떻게") ||
        msg.includes("깨는")) {
        return kb.quest;
    }
    // 4. 보상 및 토큰 감지
    if (msg.includes("보상") ||
        msg.includes("리워드") ||
        msg.includes("상품권") ||
        msg.includes("기타") ||
        msg.includes("기프티콘") ||
        msg.includes("돈") ||
        msg.includes("reward") ||
        msg.includes("other") ||
        msg.includes("prêmio") ||
        msg.includes("token") ||
        msg.includes("metaq") ||
        msg.includes("메타큐") ||
        msg.includes("usdt") ||
        msg.includes("usdc")) {
        return kb.rewards;
    }
    // 5. 추첨 및 가중치 추첨 감지
    if (msg.includes("추첨") ||
        msg.includes("가중치") ||
        msg.includes("일반") ||
        msg.includes("티켓") ||
        msg.includes("당첨") ||
        msg.includes("raffle") ||
        msg.includes("simple") ||
        msg.includes("weighted") ||
        msg.includes("sorteio") ||
        msg.includes("뽑기") ||
        msg.includes("당첨자")) {
        return kb.raffle;
    }
    // 6. 출금, 수수료, 지급일 감지
    if (msg.includes("출금") ||
        msg.includes("수수료") ||
        msg.includes("지급") ||
        msg.includes("환전") ||
        msg.includes("지갑") ||
        msg.includes("돈받") ||
        msg.includes("withdraw") ||
        msg.includes("fee") ||
        msg.includes("payout") ||
        msg.includes("saque") ||
        msg.includes("taxa") ||
        msg.includes("받아") ||
        msg.includes("전송")) {
        return kb.withdrawal;
    }
    // 7. 에러, 오류, 1:1 문의 감지
    if (msg.includes("에러") ||
        msg.includes("오류") ||
        msg.includes("안돼") ||
        msg.includes("버그") ||
        msg.includes("안됨") ||
        msg.includes("실패") ||
        msg.includes("help") ||
        msg.includes("error") ||
        msg.includes("bug") ||
        msg.includes("ajuda") ||
        msg.includes("도와") ||
        msg.includes("문의")) {
        return kb.help;
    }
    // 8. 감사 인사 및 리액션 감지
    if (msg.includes("고마") ||
        msg.includes("감사") ||
        msg.includes("땡큐") ||
        msg.includes("오케이") ||
        msg.includes("ok") ||
        msg.includes("thanks") ||
        msg.includes("obrigad") ||
        msg.includes("bye") ||
        msg.includes("잘가")) {
        return kb.thanks;
    }
    return "";
}
// 챗 히스토리 조회 API
router.get("/history", authOptional, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.json([]);
            return;
        }
        const rows = await prisma.$queryRawUnsafe(`SELECT id, userId, sender, text, locale, createdAt FROM chatmessage WHERE userId = ? ORDER BY createdAt DESC LIMIT 30`, userId);
        const messages = rows.map((row) => ({
            id: row.id,
            sender: row.sender,
            text: row.text,
            locale: row.locale,
            createdAt: row.createdAt
        })).reverse();
        res.json(messages);
    }
    catch (error) {
        console.error("Failed to fetch chat history:", error);
        res.status(500).json({ error: "Failed to fetch chat history" });
    }
});
router.post("/", authOptional, async (req, res) => {
    try {
        const { message, locale = "ko" } = req.body;
        if (!message || typeof message !== "string") {
            res.status(400).json({ error: "Message is required and must be a string." });
            return;
        }
        const lang = ["ko", "en", "pt"].includes(locale) ? locale : "ko";
        const geminiKey = process.env.GEMINI_API_KEY;
        const userId = req.user?.id || null;
        // 대화 메시지 저장 헬퍼
        const saveMessageToDb = async (sender, text) => {
            const msgId = crypto.randomUUID();
            try {
                await prisma.$executeRawUnsafe(`INSERT INTO chatmessage (id, userId, sender, text, locale, createdAt) VALUES (?, ?, ?, ?, ?, ?)`, msgId, userId, sender, text, lang, new Date());
            }
            catch (dbErr) {
                console.error(`Failed to save ${sender} message to DB:`, dbErr);
            }
        };
        // 1. 유저 메시지 저장
        await saveMessageToDb("user", message);
        // 2. 오프라인 키워드 매칭 우선 적용
        const offlineReply = analyzeMessageOffline(message, lang);
        if (offlineReply) {
            await saveMessageToDb("bot", offlineReply);
            res.json({ reply: offlineReply });
            return;
        }
        // 3. Gemini API
        if (geminiKey) {
            try {
                const systemPrompt = `You are Pickku AI Helper, a friendly and professional chatbot for Pickku, a quest-based reward platform.
Your goal is to guide users about Pickku's ecosystem.
Here is the official knowledge:
- Pickku (Pick + Quest): A premium web3-inspired platform connecting creators and users.
- Rewards: POINT (withdrawable 1:1, 0% fee), METAQ token, USDT/USDC stablecoins, and OTHER custom rewards (gift vouchers, coupons, physical gifts, etc., set by creators).
- Raffle: Simple Raffle (equal random chance) and Weighted Raffle (more tickets completed = exponentially higher chance of winning).
- Withdrawal: Handled in My Page, approved within 1-3 business days, absolutely 0% transaction fee for users.

IMPORTANT Guidelines:
1. Always respond in the requested language: "${lang === "ko" ? "Korean" : lang === "pt" ? "Portuguese" : "English"}".
2. Keep the tone friendly, helpful, and concise. Use emojis nicely.
3. Organize key details with bullet points.
4. If asked about something completely unrelated to Pickku or general knowledge, politely remind them you are the Pickku helper and bring back the topic to the platform.`;
                const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
                    contents: [
                        {
                            parts: [
                                { text: systemPrompt },
                                { text: `User Question: ${message}` }
                            ]
                        }
                    ]
                }, {
                    timeout: 8000,
                    headers: {
                        "Content-Type": "application/json"
                    }
                });
                const candidates = response.data?.candidates;
                if (candidates && candidates.length > 0) {
                    const geminiReply = candidates[0].content?.parts[0]?.text;
                    if (geminiReply) {
                        const formattedReply = geminiReply.trim();
                        await saveMessageToDb("bot", formattedReply);
                        res.json({ reply: formattedReply });
                        return;
                    }
                }
            }
            catch (geminiError) {
                console.error("Gemini API calling error, falling back to offline default:", geminiError);
            }
        }
        // 4. 대체 응답
        const defaultResources = {
            ko: `🤔 죄송합니다. 질문하신 내용에 대한 정확한 정보를 찾지 못했습니다.
Pickku 플랫폼의 **보상 체계, 추첨 방식, 포인트 출금 및 퀘스트 참여 방법** 등에 대해 질문해주시면 성심껏 안내해 드릴 수 있습니다.
원클릭으로 간편하게 정보를 얻으시려면 하단의 추천 질문 칩을 터치해 보세요!`,
            en: `🤔 I'm sorry, I couldn't find precise information regarding your request.
I can help you with topics like **Pickku rewards, raffle mechanics, point withdrawals, and quest guides**.
Try tapping one of the quick chips below for an instant guide!`,
            pt: `🤔 Desculpe, não consegui encontrar informações precisas sobre sua solicitação.
Posso ajudar você com tópicos como **recompensas Pickku, mecânica de sorteio, saque de pontos e guias de missões**.
Experimente tocar em um dos botões rápidos abaixo para obter ajuda imediata!`
        };
        const defaultReply = defaultResources[lang];
        await saveMessageToDb("bot", defaultReply);
        res.json({ reply: defaultReply });
    }
    catch (error) {
        console.error("Chatbot router critical error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
export default router;
