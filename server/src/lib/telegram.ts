import axios from 'axios';
import { prisma } from './prisma.js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = `https://api.telegram.org/bot${TOKEN}`;

export async function startTelegramBot() {
  if (!TOKEN) {
    console.warn('TELEGRAM_BOT_TOKEN is not set. Telegram Bot service skipped.');
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
          
          // Handle /start {userId}
          if (text.startsWith('/start ')) {
            const userId = text.split(' ')[1];
            if (userId) {
              await handleLinkRequest(userId, from);
            }
          }
        }
      }
    } catch (err: any) {
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

async function handleLinkRequest(userId: string, tgUser: any) {
  try {
    const handle = tgUser.username ? `@${tgUser.username}` : `ID:${tgUser.id}`;
    
    // Update user in DB
    const user = await prisma.user.update({
      where: { id: userId },
      data: { telegramHandle: handle },
    });

    console.log(`Linked Telegram for user ${user.email}: ${handle}`);

    // Send confirmation to user
    await axios.post(`${API_URL}/sendMessage`, {
      chat_id: tgUser.id,
      text: `✅ 연동이 완료되었습니다!\n\n계정: ${user.email}\n핸들: ${handle}\n\n이제 픽쿠(pickku)에서 미션을 수행하실 수 있습니다.`,
    });
  } catch (err: any) {
    console.error('Failed to link telegram handle:', err.message);
  }
}
