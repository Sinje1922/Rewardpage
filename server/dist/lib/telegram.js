import "dotenv/config";
import axios from 'axios';
import { prisma } from './prisma.js';
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = `https://api.telegram.org/bot${TOKEN}`;
export async function startTelegramBot() {
    if (!TOKEN) {
        console.warn(`[Telegram] TELEGRAM_BOT_TOKEN is not set (cwd: ${process.cwd()}). Telegram Bot service skipped.`);
        return;
    }
    console.log('Starting Telegram Bot Polling Service...');
    let lastUpdateId = 0;
    // Simple polling loop
    const poll = async () => {
        try {
            const response = await axios.get(`${API_URL}/getUpdates`, {
                params: {
                    offset: lastUpdateId + 1,
                    timeout: 30,
                },
            });
            const updates = response.data.result;
            for (const update of updates) {
                lastUpdateId = update.update_id;
                if (update.message && update.message.text) {
                    const { text, from } = update.message;
                    // Handle /start
                    if (text.startsWith('/start')) {
                        const parts = text.split(' ');
                        if (parts.length > 1) {
                            const userId = parts[1];
                            await handleLinkRequest(userId, from);
                        }
                        else {
                            // No ID provided, send guide message
                            await axios.post(`${API_URL}/sendMessage`, {
                                chat_id: from.id,
                                text: "반갑습니다! 👋\n\n이 봇은 픽쿠(pickku) 계정 연동을 위한 봇입니다.\n\n연동을 하시려면 홈페이지의 [마이페이지] > [SNS 계정 연동]에서 [인증하기] 버튼을 눌러 이동해 주세요.",
                            });
                        }
                    }
                }
            }
        }
        catch (err) {
            // Avoid spamming logs on network errors
            if (err.code !== 'ECONNRESET' && err.code !== 'ETIMEDOUT') {
                console.error('Telegram Bot Polling Error:', err.message);
            }
        }
        // Continue polling
        setTimeout(poll, 1000);
    };
    poll();
}
async function handleLinkRequest(userId, tgUser) {
    try {
        const handle = tgUser.username ? `@${tgUser.username}` : `ID:${tgUser.id}`;
        // Update user in DB
        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                telegramHandle: handle,
                telegramId: String(tgUser.id)
            },
        });
        console.log(`Linked Telegram for user ${user.email}: ${handle} (ID:${tgUser.id})`);
        // Send confirmation to user
        await axios.post(`${API_URL}/sendMessage`, {
            chat_id: tgUser.id,
            text: `✅ 연동이 완료되었습니다!\n\n계정: ${user.email}\n핸들: ${handle}\n\n이제 픽쿠(pickku)에서 미션을 수행하실 수 있습니다.`,
        });
    }
    catch (err) {
        console.error('Failed to link telegram handle:', err.message);
    }
}
export async function checkTelegramMembership(chatId, userId) {
    if (!TOKEN)
        return { success: false, error: "서버에 텔레그램 봇 토큰이 설정되지 않았습니다." };
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.telegramId)
            return { success: false, error: "텔레그램 계정 연동이 필요합니다. 마이페이지에서 연동해 주세요." };
        const cleanChatId = chatId.startsWith('@') ? chatId : `@${chatId}`;
        const response = await axios.get(`${API_URL}/getChatMember`, {
            params: {
                chat_id: cleanChatId,
                user_id: user.telegramId,
            },
        });
        const status = response.data.result?.status;
        const isMember = ['member', 'administrator', 'creator'].includes(status);
        if (isMember) {
            return { success: true };
        }
        else {
            return { success: false, error: "채널/그룹에 참여하지 않았습니다. 입장을 완료해 주세요." };
        }
    }
    catch (err) {
        const errorData = err.response?.data;
        console.error('Telegram Membership Check Error:', errorData || err.message);
        let friendlyError = "텔레그램 참여 검증에 실패했습니다.";
        if (errorData?.description) {
            if (errorData.description.includes("chat not found")) {
                friendlyError = "채널/그룹을 찾을 수 없습니다. 미션 URL이 올바른지, 혹은 픽쿠 공식 봇(@Pickku_Official_bot)이 채널/그룹에 추가되었는지 확인해 주세요.";
            }
            else if (errorData.description.includes("bot is not a member")) {
                friendlyError = "봇이 채널/그룹의 멤버가 아닙니다. 픽쿠 공식 봇(@Pickku_Official_bot)을 관리자나 멤버로 추가해 주세요.";
            }
            else {
                friendlyError = `텔레그램 오류: ${errorData.description}`;
            }
        }
        else {
            friendlyError = `네트워크 오류: ${err.message}`;
        }
        return { success: false, error: friendlyError };
    }
}
